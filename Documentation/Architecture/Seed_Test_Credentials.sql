-- =========================================================================================
-- Knome EEP Portal — Safe Seed & Reset Script for API Testing Credentials
-- Database: Knome (Microsoft SQL Server)
-- Purpose: Ensures required roles, departments, categories, and test user accounts exist
--          with known passwords for manual verification via Swagger UI (localhost:5095/swagger).
-- Note: This script is idempotent (safe to run multiple times without duplicate errors).
-- =========================================================================================

USE [Knome];
GO

PRINT '=== [1/6] Verifying Base Authorization Roles ===';
IF NOT EXISTS (SELECT 1 FROM [Roles] WHERE [RoleName] = 'Employee')
    INSERT INTO [Roles] ([RoleName], [Description]) VALUES ('Employee', 'Standard EEP employee access');

IF NOT EXISTS (SELECT 1 FROM [Roles] WHERE [RoleName] = 'Community Admin')
    INSERT INTO [Roles] ([RoleName], [Description]) VALUES ('Community Admin', 'Can manage communities, join requests, and pinned posts');

IF NOT EXISTS (SELECT 1 FROM [Roles] WHERE [RoleName] = 'HR Administrator')
    INSERT INTO [Roles] ([RoleName], [Description]) VALUES ('HR Administrator', 'Can manage employee profiles, departments, roles, jobs, and broadcasts');

IF NOT EXISTS (SELECT 1 FROM [Roles] WHERE [RoleName] = 'System Administrator')
    INSERT INTO [Roles] ([RoleName], [Description]) VALUES ('System Administrator', 'Full system access, audit logs, jobs, broadcasts, and governance');
GO

PRINT '=== [2/6] Verifying Default Department ===';
IF NOT EXISTS (SELECT 1 FROM [Departments] WHERE [Name] = 'Technology')
    INSERT INTO [Departments] ([Name], [Code], [IsActive]) VALUES ('Technology', 'TECH', 1);

IF NOT EXISTS (SELECT 1 FROM [Departments] WHERE [Name] = 'Human Resources')
    INSERT INTO [Departments] ([Name], [Code], [IsActive]) VALUES ('Human Resources', 'HR', 1);
GO

PRINT '=== [3/6] Verifying Default Content Categories ===';
IF NOT EXISTS (SELECT 1 FROM [Categories] WHERE [Name] = 'Engineering' AND [AppliesTo] = 'Article')
    INSERT INTO [Categories] ([Name], [AppliesTo]) VALUES ('Engineering', 'Article');

IF NOT EXISTS (SELECT 1 FROM [Categories] WHERE [Name] = 'Tech Talks' AND [AppliesTo] = 'Video')
    INSERT INTO [Categories] ([Name], [AppliesTo]) VALUES ('Tech Talks', 'Video');

IF NOT EXISTS (SELECT 1 FROM [Categories] WHERE [Name] = 'Leadership' AND [AppliesTo] = 'Podcast')
    INSERT INTO [Categories] ([Name], [AppliesTo]) VALUES ('Leadership', 'Podcast');
GO

PRINT '=== [4/6] Seeding & Resetting Test User Accounts (Password: Password@123) ===';
-- BCrypt hash for 'Password@123' with work factor 11:
-- $2a$11$CS8Szl.LS4r1zinkLjKb8ucRdww25eHjSGhqc6my/hQXCbb9DW0Nm

DECLARE @TechDeptId INT = (SELECT TOP 1 [DepartmentId] FROM [Departments] WHERE [Name] = 'Technology');
DECLARE @HrDeptId INT = (SELECT TOP 1 [DepartmentId] FROM [Departments] WHERE [Name] = 'Human Resources');

-- Helper function simulation via script
DECLARE @Hash NVARCHAR(255) = '$2a$11$CS8Szl.LS4r1zinkLjKb8ucRdww25eHjSGhqc6my/hQXCbb9DW0Nm';
DECLARE @Salt NVARCHAR(255) = 'STATIC_SALT_FOR_BCRYPT';

-- 4.1 MPO101: Loveneesh Sharma (System Administrator)
IF NOT EXISTS (SELECT 1 FROM [Users] WHERE [EmployeeId] = 'MPO101')
BEGIN
    INSERT INTO [Users] ([EmployeeId], [Email], [FullName], [Designation], [DepartmentId], [Location], [BioVisibility], [NetworkVisibility], [PhotosVisibility], [InterestsVisibility], [IsActive], [IsPermanentlySuspended], [CreatedDate])
    VALUES ('MPO101', 'mpo101@knome.local', 'Loveneesh Sharma', 'System Administrator', @TechDeptId, 'Bhopal HQ', 'Public', 'Public', 'Public', 'Public', 1, 0, GETUTCDATE());
END
ELSE BEGIN UPDATE [Users] SET [IsActive] = 1, [IsPermanentlySuspended] = 0 WHERE [EmployeeId] = 'MPO101'; END
DECLARE @U1 INT = (SELECT [UserId] FROM [Users] WHERE [EmployeeId] = 'MPO101');
IF NOT EXISTS (SELECT 1 FROM [UserCredentials] WHERE [UserId] = @U1)
    INSERT INTO [UserCredentials] ([UserId], [PasswordHash], [PasswordSalt]) VALUES (@U1, @Hash, @Salt);
ELSE UPDATE [UserCredentials] SET [PasswordHash] = @Hash WHERE [UserId] = @U1;

-- 4.2 MPO102: Vishendra Sharma (Community Admin)
IF NOT EXISTS (SELECT 1 FROM [Users] WHERE [EmployeeId] = 'MPO102')
BEGIN
    INSERT INTO [Users] ([EmployeeId], [Email], [FullName], [Designation], [DepartmentId], [Location], [BioVisibility], [NetworkVisibility], [PhotosVisibility], [InterestsVisibility], [IsActive], [IsPermanentlySuspended], [CreatedDate])
    VALUES ('MPO102', 'mpo102@knome.local', 'Vishendra Sharma', 'Community Manager', @TechDeptId, 'Bhopal HQ', 'Public', 'Public', 'Public', 'Public', 1, 0, GETUTCDATE());
END
ELSE BEGIN UPDATE [Users] SET [IsActive] = 1, [IsPermanentlySuspended] = 0 WHERE [EmployeeId] = 'MPO102'; END
DECLARE @U2 INT = (SELECT [UserId] FROM [Users] WHERE [EmployeeId] = 'MPO102');
IF NOT EXISTS (SELECT 1 FROM [UserCredentials] WHERE [UserId] = @U2)
    INSERT INTO [UserCredentials] ([UserId], [PasswordHash], [PasswordSalt]) VALUES (@U2, @Hash, @Salt);
ELSE UPDATE [UserCredentials] SET [PasswordHash] = @Hash WHERE [UserId] = @U2;

-- 4.3 MPO103: Sourabh Sahu (HR Administrator)
IF NOT EXISTS (SELECT 1 FROM [Users] WHERE [EmployeeId] = 'MPO103')
BEGIN
    INSERT INTO [Users] ([EmployeeId], [Email], [FullName], [Designation], [DepartmentId], [Location], [BioVisibility], [NetworkVisibility], [PhotosVisibility], [InterestsVisibility], [IsActive], [IsPermanentlySuspended], [CreatedDate])
    VALUES ('MPO103', 'mpo103@knome.local', 'Sourabh Sahu', 'HR Lead Specialist', @HrDeptId, 'Bhopal HQ', 'Public', 'Public', 'Public', 'Public', 1, 0, GETUTCDATE());
END
ELSE BEGIN UPDATE [Users] SET [IsActive] = 1, [IsPermanentlySuspended] = 0 WHERE [EmployeeId] = 'MPO103'; END
DECLARE @U3 INT = (SELECT [UserId] FROM [Users] WHERE [EmployeeId] = 'MPO103');
IF NOT EXISTS (SELECT 1 FROM [UserCredentials] WHERE [UserId] = @U3)
    INSERT INTO [UserCredentials] ([UserId], [PasswordHash], [PasswordSalt]) VALUES (@U3, @Hash, @Salt);
ELSE UPDATE [UserCredentials] SET [PasswordHash] = @Hash WHERE [UserId] = @U3;

-- 4.4 MPO104: Rishikesh Ugle (Employee)
IF NOT EXISTS (SELECT 1 FROM [Users] WHERE [EmployeeId] = 'MPO104')
BEGIN
    INSERT INTO [Users] ([EmployeeId], [Email], [FullName], [Designation], [DepartmentId], [Location], [BioVisibility], [NetworkVisibility], [PhotosVisibility], [InterestsVisibility], [IsActive], [IsPermanentlySuspended], [CreatedDate])
    VALUES ('MPO104', 'mpo104@knome.local', 'Rishikesh Ugle', 'Software Engineer', @TechDeptId, 'Bhopal HQ', 'Public', 'Public', 'Public', 'Public', 1, 0, GETUTCDATE());
END
ELSE BEGIN UPDATE [Users] SET [IsActive] = 1, [IsPermanentlySuspended] = 0 WHERE [EmployeeId] = 'MPO104'; END
DECLARE @U4 INT = (SELECT [UserId] FROM [Users] WHERE [EmployeeId] = 'MPO104');
IF NOT EXISTS (SELECT 1 FROM [UserCredentials] WHERE [UserId] = @U4)
    INSERT INTO [UserCredentials] ([UserId], [PasswordHash], [PasswordSalt]) VALUES (@U4, @Hash, @Salt);
ELSE UPDATE [UserCredentials] SET [PasswordHash] = @Hash WHERE [UserId] = @U4;

-- 4.5 MPO105: Meghna Tiwari (Employee)
IF NOT EXISTS (SELECT 1 FROM [Users] WHERE [EmployeeId] = 'MPO105')
BEGIN
    INSERT INTO [Users] ([EmployeeId], [Email], [FullName], [Designation], [DepartmentId], [Location], [BioVisibility], [NetworkVisibility], [PhotosVisibility], [InterestsVisibility], [IsActive], [IsPermanentlySuspended], [CreatedDate])
    VALUES ('MPO105', 'mpo105@knome.local', 'Meghna Tiwari', 'Software Engineer', @TechDeptId, 'Bhopal HQ', 'Public', 'Public', 'Public', 'Public', 1, 0, GETUTCDATE());
END
ELSE BEGIN UPDATE [Users] SET [IsActive] = 1, [IsPermanentlySuspended] = 0 WHERE [EmployeeId] = 'MPO105'; END
DECLARE @U5 INT = (SELECT [UserId] FROM [Users] WHERE [EmployeeId] = 'MPO105');
IF NOT EXISTS (SELECT 1 FROM [UserCredentials] WHERE [UserId] = @U5)
    INSERT INTO [UserCredentials] ([UserId], [PasswordHash], [PasswordSalt]) VALUES (@U5, @Hash, @Salt);
ELSE UPDATE [UserCredentials] SET [PasswordHash] = @Hash WHERE [UserId] = @U5;

-- 4.6 MPO106: Mayur Verma (Employee)
IF NOT EXISTS (SELECT 1 FROM [Users] WHERE [EmployeeId] = 'MPO106')
BEGIN
    INSERT INTO [Users] ([EmployeeId], [Email], [FullName], [Designation], [DepartmentId], [Location], [BioVisibility], [NetworkVisibility], [PhotosVisibility], [InterestsVisibility], [IsActive], [IsPermanentlySuspended], [CreatedDate])
    VALUES ('MPO106', 'mpo106@knome.local', 'Mayur Verma', 'Software Engineer', @TechDeptId, 'Bhopal HQ', 'Public', 'Public', 'Public', 'Public', 1, 0, GETUTCDATE());
END
ELSE BEGIN UPDATE [Users] SET [IsActive] = 1, [IsPermanentlySuspended] = 0 WHERE [EmployeeId] = 'MPO106'; END
DECLARE @U6 INT = (SELECT [UserId] FROM [Users] WHERE [EmployeeId] = 'MPO106');
IF NOT EXISTS (SELECT 1 FROM [UserCredentials] WHERE [UserId] = @U6)
    INSERT INTO [UserCredentials] ([UserId], [PasswordHash], [PasswordSalt]) VALUES (@U6, @Hash, @Salt);
ELSE UPDATE [UserCredentials] SET [PasswordHash] = @Hash WHERE [UserId] = @U6;
GO

PRINT '=== [5/6] Assigning Roles to Test Users ===';
DECLARE @RoleEmp INT = (SELECT [RoleId] FROM [Roles] WHERE [RoleName] = 'Employee');
DECLARE @RoleCommAdmin INT = (SELECT [RoleId] FROM [Roles] WHERE [RoleName] = 'Community Admin');
DECLARE @RoleHrAdmin INT = (SELECT [RoleId] FROM [Roles] WHERE [RoleName] = 'HR Administrator');
DECLARE @RoleSysAdmin INT = (SELECT [RoleId] FROM [Roles] WHERE [RoleName] = 'System Administrator');

DECLARE @U1 INT = (SELECT [UserId] FROM [Users] WHERE [EmployeeId] = 'MPO101');
DECLARE @U2 INT = (SELECT [UserId] FROM [Users] WHERE [EmployeeId] = 'MPO102');
DECLARE @U3 INT = (SELECT [UserId] FROM [Users] WHERE [EmployeeId] = 'MPO103');
DECLARE @U4 INT = (SELECT [UserId] FROM [Users] WHERE [EmployeeId] = 'MPO104');
DECLARE @U5 INT = (SELECT [UserId] FROM [Users] WHERE [EmployeeId] = 'MPO105');
DECLARE @U6 INT = (SELECT [UserId] FROM [Users] WHERE [EmployeeId] = 'MPO106');

-- Ensure all users have at least 'Employee' role
IF @U1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM [UserRoles] WHERE [UserId] = @U1 AND [RoleId] = @RoleEmp) INSERT INTO [UserRoles] ([UserId], [RoleId]) VALUES (@U1, @RoleEmp);
IF @U2 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM [UserRoles] WHERE [UserId] = @U2 AND [RoleId] = @RoleEmp) INSERT INTO [UserRoles] ([UserId], [RoleId]) VALUES (@U2, @RoleEmp);
IF @U3 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM [UserRoles] WHERE [UserId] = @U3 AND [RoleId] = @RoleEmp) INSERT INTO [UserRoles] ([UserId], [RoleId]) VALUES (@U3, @RoleEmp);
IF @U4 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM [UserRoles] WHERE [UserId] = @U4 AND [RoleId] = @RoleEmp) INSERT INTO [UserRoles] ([UserId], [RoleId]) VALUES (@U4, @RoleEmp);
IF @U5 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM [UserRoles] WHERE [UserId] = @U5 AND [RoleId] = @RoleEmp) INSERT INTO [UserRoles] ([UserId], [RoleId]) VALUES (@U5, @RoleEmp);
IF @U6 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM [UserRoles] WHERE [UserId] = @U6 AND [RoleId] = @RoleEmp) INSERT INTO [UserRoles] ([UserId], [RoleId]) VALUES (@U6, @RoleEmp);

-- Assign specific roles
IF @U1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM [UserRoles] WHERE [UserId] = @U1 AND [RoleId] = @RoleSysAdmin) INSERT INTO [UserRoles] ([UserId], [RoleId]) VALUES (@U1, @RoleSysAdmin);
IF @U2 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM [UserRoles] WHERE [UserId] = @U2 AND [RoleId] = @RoleCommAdmin) INSERT INTO [UserRoles] ([UserId], [RoleId]) VALUES (@U2, @RoleCommAdmin);
IF @U3 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM [UserRoles] WHERE [UserId] = @U3 AND [RoleId] = @RoleHrAdmin) INSERT INTO [UserRoles] ([UserId], [RoleId]) VALUES (@U3, @RoleHrAdmin);
GO

PRINT '=== [6/6] Ensuring Karma Balance Rows for Test Users ===';
INSERT INTO [KarmaBalances] ([UserId], [TotalPoints], [BadgeLevel], [LastUpdatedDate])
SELECT u.[UserId], CASE WHEN u.[EmployeeId] = 'MPO101' THEN 0 ELSE 150 END, 'Bronze', GETUTCDATE()
FROM [Users] u
WHERE u.[EmployeeId] IN ('MPO101', 'MPO102', 'MPO103', 'MPO104', 'MPO105', 'MPO106')
  AND NOT EXISTS (SELECT 1 FROM [KarmaBalances] kb WHERE kb.[UserId] = u.[UserId]);
GO

PRINT '=== Seed Verification Complete! ===';
PRINT 'Test Credentials Available:';
PRINT '  MPO101 / Password@123 -> Roles: [Employee, System Administrator] (Loveneesh Sharma)';
PRINT '  MPO102 / Password@123 -> Roles: [Employee, Community Admin] (Vishendra Sharma)';
PRINT '  MPO103 / Password@123 -> Roles: [Employee, HR Administrator] (Sourabh Sahu)';
PRINT '  MPO104 / Password@123 -> Roles: [Employee] (Rishikesh Ugle)';
PRINT '  MPO105 / Password@123 -> Roles: [Employee] (Meghna Tiwari)';
PRINT '  MPO106 / Password@123 -> Roles: [Employee] (Mayur Verma)';
GO
