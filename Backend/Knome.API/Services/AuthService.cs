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

    public AuthService(KnomeDbContext db, IOptions<JwtSettings> jwtOptions)
    {
        _db = db;
        _jwt = jwtOptions.Value;
    }

    public async Task<LoginResponseDto> LoginAsync(LoginRequestDto request)
    {
        // Load user with credential, department and roles in a single query
        var user = await _db.Users
            .Include(u => u.UserCredential)
            .Include(u => u.Department)
            .Include(u => u.Roles)
            .Where(u => u.EmployeeId == request.EmployeeId)
            .FirstOrDefaultAsync();

        if (user is null || user.UserCredential is null)
            throw new BadRequestException("Invalid Employee ID or password.");

        if (user.IsPermanentlySuspended || (user.SuspendedUntil.HasValue && user.SuspendedUntil > DateTime.UtcNow))
            throw new BadRequestException("This account has been suspended. Please contact HR.");

        if (!user.IsActive)
            throw new BadRequestException("This account has been deactivated. Please contact HR.");

        var passwordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.UserCredential.PasswordHash);
        if (!passwordValid)
            throw new BadRequestException("Invalid Employee ID or password.");

        var roles = user.Roles.Select(r => r.RoleName).ToList();
        var expiry = DateTime.UtcNow.AddMinutes(_jwt.ExpiryMinutes);
        var token = GenerateJwtToken(user.UserId, user.EmployeeId, user.FullName, roles, expiry);

        return new LoginResponseDto
        {
            Token = token,
            ExpiresAt = expiry,
            User = MapToCurrentUser(user, roles)
        };
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
