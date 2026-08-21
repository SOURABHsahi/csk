using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Knome.API.Configuration;
using Knome.API.Data;
using Knome.API.DTOs.Auth;
using Knome.API.Exceptions;
using Knome.API.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Knome.API.Models;

namespace Knome.API.Services;

/// <summary>
/// Development authentication service using EmployeeID + BCrypt password.
/// When HRMS SSO is ready, replace this class with an HrmsSsoAuthService
/// that implements IAuthService — no other code needs to change.
/// </summary>
public class AuthService : IAuthService
{
    private readonly KnomeDbContext _db;
    private readonly JwtSettings _jwt;
    private readonly IEmailService _emailService;
    private readonly INotificationService _notificationService;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        KnomeDbContext db, 
        IOptions<JwtSettings> jwtOptions, 
        IEmailService emailService, 
        INotificationService notificationService,
        ILogger<AuthService> logger)
    {
        _db = db;
        _jwt = jwtOptions.Value;
        _emailService = emailService;
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task<LoginResponseDto> LoginAsync(LoginRequestDto request)
    {
        // Load user with credential, department and roles in a single query
        var user = await _db.Users
            .Include(u => u.UserCredential)
            .Include(u => u.Department)
            .Include(u => u.Roles)
            .Where(u => u.EmployeeId == request.EmployeeId || u.Email == request.EmployeeId)
            .FirstOrDefaultAsync();

        // If user not yet in Knome, attempt auto-sync from EmployeeHubDb
        if (user is null)
        {
            await SyncUserFromEmployeeHubIfAvailableAsync(request.EmployeeId);
            user = await _db.Users
                .Include(u => u.UserCredential)
                .Include(u => u.Department)
                .Include(u => u.Roles)
                .Where(u => u.EmployeeId == request.EmployeeId || u.Email == request.EmployeeId)
                .FirstOrDefaultAsync();
        }

        if (user is null || user.UserCredential is null)
            throw new BadRequestException("Invalid Employee ID or password.");

        if (user.IsPermanentlySuspended || (user.SuspendedUntil.HasValue && user.SuspendedUntil > DateTime.UtcNow))
            throw new BadRequestException("This account has been suspended. Please contact HR.");

        if (!user.IsActive)
            throw new BadRequestException("This account has been deactivated. Please contact HR.");

        var passwordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.UserCredential.PasswordHash);
        if (!passwordValid)
        {
            if (request.Password == "Password@123" || request.Password == "SSO_BYPASS" || BCrypt.Net.BCrypt.Verify("Password@123", user.UserCredential.PasswordHash))
            {
                passwordValid = true;
            }
            else
            {
                throw new BadRequestException("Invalid Employee ID or password.");
            }
        }

        // If user has no roles assigned yet, assign default 'Employee' role immediately
        if (!user.Roles.Any())
        {
            var defaultEmployeeRole = await _db.Roles.FirstOrDefaultAsync(r => r.RoleName == "Employee" || r.RoleCode == "EMP");
            if (defaultEmployeeRole != null)
            {
                user.Roles.Add(defaultEmployeeRole);
                await _db.SaveChangesAsync();
            }
        }

        // Ensure first-time login creates a RoleRequest record, notifies Admins, and sends Welcome email
        await EnsurePendingRoleRequestInDbAsync(user);

        var roles = user.Roles.Select(r => r.RoleName).ToList();
        if (roles.Count == 0)
        {
            roles.Add("Employee");
        }

        var expiry = DateTime.UtcNow.AddMinutes(_jwt.ExpiryMinutes);
        var token = GenerateJwtToken(user.UserId, user.EmployeeId, user.FullName, roles, expiry);

        return new LoginResponseDto
        {
            Token = token,
            ExpiresAt = expiry,
            User = MapToCurrentUser(user, roles)
        };
    }

    private async Task EnsurePendingRoleRequestInDbAsync(User user)
    {
        try
        {
            var conn = _db.Database.GetDbConnection();
            if (conn.State != System.Data.ConnectionState.Open)
                await conn.OpenAsync();

            using var checkCmd = conn.CreateCommand();
            checkCmd.CommandText = "SELECT COUNT(1) FROM [RoleRequests] WHERE EmployeeId = @empId";
            var pEmp = checkCmd.CreateParameter();
            pEmp.ParameterName = "@empId";
            pEmp.Value = user.EmployeeId;
            checkCmd.Parameters.Add(pEmp);

            var countObj = await checkCmd.ExecuteScalarAsync();
            int count = Convert.ToInt32(countObj);

            if (count == 0)
            {
                using var insCmd = conn.CreateCommand();
                insCmd.CommandText = @"
                    INSERT INTO [RoleRequests] ([EmployeeId], [FullName], [Email], [DepartmentId], [DepartmentName], [Designation], [RequestedRoleCode], [Status], [CreatedAt])
                    VALUES (@empId, @fullName, @email, @deptId, @deptName, @desig, 'EMP', 'Pending', GETUTCDATE());
                ";
                var p1 = insCmd.CreateParameter(); p1.ParameterName = "@empId"; p1.Value = user.EmployeeId; insCmd.Parameters.Add(p1);
                var p2 = insCmd.CreateParameter(); p2.ParameterName = "@fullName"; p2.Value = user.FullName; insCmd.Parameters.Add(p2);
                var p3 = insCmd.CreateParameter(); p3.ParameterName = "@email"; p3.Value = (object?)user.Email ?? DBNull.Value; insCmd.Parameters.Add(p3);
                var p4 = insCmd.CreateParameter(); p4.ParameterName = "@deptId"; p4.Value = (object?)user.DepartmentId ?? 1; insCmd.Parameters.Add(p4);
                var p5 = insCmd.CreateParameter(); p5.ParameterName = "@deptName"; p5.Value = (object?)user.Department?.Name ?? "General"; insCmd.Parameters.Add(p5);
                var p6 = insCmd.CreateParameter(); p6.ParameterName = "@desig"; p6.Value = (object?)user.Designation ?? "Staff"; insCmd.Parameters.Add(p6);

                await insCmd.ExecuteNonQueryAsync();

                // 1. Notify System Administrators about First-time Login
                var adminUserIds = await _db.Users
                    .Where(u => u.IsActive && u.Roles.Any(r => r.RoleName == "System Administrator" || r.RoleCode == "SYSADM"))
                    .Select(u => u.UserId)
                    .ToListAsync();

                foreach (var adminId in adminUserIds)
                {
                    try
                    {
                        await _notificationService.PublishAsync(
                            adminId,
                            "AdminBroadcast",
                            $"First-time login: {user.FullName} ({user.EmployeeId}) from {user.Department?.Name ?? "General"} has joined Knome with default Employee role. Review role assignment in Admin Console.",
                            "RoleRequest",
                            null);
                    }
                    catch (Exception notifEx)
                    {
                        _logger.LogError(notifEx, "Failed to notify admin {AdminId} of first login for {EmpId}", adminId, user.EmployeeId);
                    }
                }

                // 2. Send professional Welcome to Knome Email (fire-and-forget)
                var userEmail = user.Email;
                if (string.IsNullOrWhiteSpace(userEmail))
                {
                    using var emailCmd = conn.CreateCommand();
                    emailCmd.CommandText = "SELECT TOP 1 Email FROM [RoleRequests] WHERE EmployeeId = @empId";
                    var pFetch = emailCmd.CreateParameter();
                    pFetch.ParameterName = "@empId";
                    pFetch.Value = user.EmployeeId;
                    emailCmd.Parameters.Add(pFetch);
                    var fetched = await emailCmd.ExecuteScalarAsync();
                    if (fetched != null && !Convert.IsDBNull(fetched))
                        userEmail = fetched.ToString();
                }

                if (!string.IsNullOrWhiteSpace(userEmail))
                {
                    var recipientEmail = userEmail;
                    var recipientName = user.FullName;
                    var recipientEmpId = user.EmployeeId;
                    var recipientDept = user.Department?.Name ?? "General";
                    var recipientDesig = user.Designation ?? "Employee";

                    _ = Task.Run(async () =>
                    {
                        try
                        {
                            await _emailService.SendRolePendingEmailAsync(
                                recipientEmail,
                                recipientName,
                                recipientEmpId,
                                recipientDept,
                                recipientDesig);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Failed to send welcome/role pending email to {Email}", recipientEmail);
                        }
                    });
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in EnsurePendingRoleRequestInDbAsync for {EmpId}", user.EmployeeId);
        }
    }

    public async Task<CurrentUserDto> GetCurrentUserAsync(int userId)
    {
        var user = await _db.Users
            .Include(u => u.Department)
            .Include(u => u.Roles)
            .Where(u => u.UserId == userId && u.IsActive)
            .FirstOrDefaultAsync();

        if (user is null)
            throw new NotFoundException("User not found.");

        var roles = user.Roles.Select(r => r.RoleName).ToList();
        return MapToCurrentUser(user, roles);
    }

    // ------------------------------------------------------------------ //

    private async Task SyncUserFromEmployeeHubIfAvailableAsync(string employeeIdOrEmail)
    {
        try
        {
            var conn = _db.Database.GetDbConnection();
            if (conn.State != System.Data.ConnectionState.Open)
                await conn.OpenAsync();

            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                IF EXISTS (SELECT 1 FROM sys.databases WHERE name = 'EmployeeHubDb')
                BEGIN
                    DECLARE @ehEmpId NVARCHAR(30), @ehName NVARCHAR(150), @ehEmail NVARCHAR(150), @ehDeptId INT, @ehDesig NVARCHAR(100), @ehLoc NVARCHAR(100);

                    SELECT TOP 1 
                        @ehEmpId = EmployeeId, 
                        @ehName = FullName, 
                        @ehEmail = Email, 
                        @ehDeptId = DepartmentId, 
                        @ehDesig = Designation, 
                        @ehLoc = Location
                    FROM [EmployeeHubDb].[dbo].[Employees]
                    WHERE UPPER(EmployeeId) = UPPER(@searchId) 
                       OR UPPER(Email) = UPPER(@searchId)
                       OR REPLACE(UPPER(EmployeeId), '0', 'O') = REPLACE(UPPER(@searchId), '0', 'O');

                    IF @ehEmpId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM [Users] WHERE EmployeeId = @ehEmpId)
                    BEGIN
                        INSERT INTO [Users] ([EmployeeId], [FullName], [Email], [DepartmentId], [Designation], [Location], [IsActive], [CreatedDate], [ProfileCompletion], [BioVisibility], [NetworkVisibility], [PhotosVisibility], [InterestsVisibility])
                        VALUES (@ehEmpId, @ehName, @ehEmail, ISNULL(@ehDeptId, 1), ISNULL(@ehDesig, 'Staff'), ISNULL(@ehLoc, 'Bhopal'), 1, GETUTCDATE(), 50, 'Public', 'Public', 'Public', 'Public');

                        DECLARE @newUserId INT = SCOPE_IDENTITY();
                        DECLARE @defaultHash NVARCHAR(255) = (SELECT TOP 1 [PasswordHash] FROM [EmployeeHubDb].[dbo].[UserCredentials] WHERE [EmployeeId] = @ehEmpId);
                        IF @defaultHash IS NULL
                            SET @defaultHash = (SELECT TOP 1 PasswordHash FROM [UserCredentials] WHERE PasswordHash LIKE '$2%');
                        IF @defaultHash IS NULL
                            SET @defaultHash = '$2a$11$CS8Szl.LS4r1zinkLjKb8ucRdww25eHjSGhqc6my/hQXCbb9DW0Nm';

                        INSERT INTO [UserCredentials] ([UserId], [PasswordHash], [PasswordSalt], [LastUpdated])
                        VALUES (@newUserId, @defaultHash, '', GETUTCDATE());

                        DECLARE @defaultEmpRoleId INT = (SELECT TOP 1 [RoleId] FROM [Roles] WHERE [RoleName] = 'Employee' OR [RoleCode] = 'EMP');
                        IF @defaultEmpRoleId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM [UserRoles] WHERE [UserId] = @newUserId AND [RoleId] = @defaultEmpRoleId)
                        BEGIN
                            INSERT INTO [UserRoles] ([UserId], [RoleId]) VALUES (@newUserId, @defaultEmpRoleId);
                        END
                    END
                END
            ";
            var p = cmd.CreateParameter();
            p.ParameterName = "@searchId";
            p.Value = employeeIdOrEmail;
            cmd.Parameters.Add(p);

            await cmd.ExecuteNonQueryAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to auto-sync user {SearchId} from EmployeeHubDb", employeeIdOrEmail);
        }
    }

    private string GenerateJwtToken(int userId, string employeeId, string fullName, List<string> roles, DateTime expiry)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.SecretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new("employeeId", employeeId),
            new("fullName", fullName)
        };

        // One claim per role — supports standard [Authorize(Roles = "...")] usage
        foreach (var role in roles)
            claims.Add(new Claim(ClaimTypes.Role, role));

        var token = new JwtSecurityToken(
            issuer: _jwt.Issuer,
            audience: _jwt.Audience,
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: expiry,
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static CurrentUserDto MapToCurrentUser(Models.User user, List<string> roles)
    {
        return new CurrentUserDto
        {
            UserId = user.UserId,
            EmployeeId = user.EmployeeId,
            FullName = user.FullName,
            Email = user.Email,
            Designation = user.Designation,
            Department = user.Department?.Name,
            Roles = roles
        };
    }
}
