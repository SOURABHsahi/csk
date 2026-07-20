using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Knome.API.Data;
using Knome.API.DTOs.User;
using Knome.API.Exceptions;
using Knome.API.Interfaces;
using Knome.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Knome.API.Repositories;

public class UserRepository : Repository<Models.User>, IUserRepository
{
    private readonly KnomeDbContext _db;

    public UserRepository(KnomeDbContext context) : base(context)
    {
        _db = context;
    }

    public async Task<Models.User?> GetProfileByIdAsync(int userId)
    {
        return await _db.Users
            .Include(u => u.Department)
            .Include(u => u.Roles)
            .Include(u => u.UserSkills)
            .Include(u => u.UserInterests)
            .Include(u => u.FollowerFollowerUsers)
            .Include(u => u.FollowerFollowingUsers)
            .Include(u => u.KarmaBalance)
            .FirstOrDefaultAsync(u => u.UserId == userId);
    }

    public async Task<PagedResultDto<Models.User>> GetPagedUsersAsync(UserFilterDto filter)
    {
        var query = _db.Users
            .Include(u => u.Department)
            .Include(u => u.Roles)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
        {
            var term = filter.SearchTerm.Trim().ToLower();
            query = query.Where(u =>
                u.FullName.ToLower().Contains(term) ||
                u.Email.ToLower().Contains(term) ||
                u.EmployeeId.ToLower().Contains(term));
        }

        if (filter.DepartmentId.HasValue && filter.DepartmentId.Value > 0)
        {
            query = query.Where(u => u.DepartmentId == filter.DepartmentId.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.RoleName))
        {
            query = query.Where(u => u.Roles.Any(r => r.RoleName == filter.RoleName));
        }

        if (filter.IsActive.HasValue)
        {
            query = query.Where(u => u.IsActive == filter.IsActive.Value);
        }

        if (filter.IsSuspended.HasValue)
        {
            if (filter.IsSuspended.Value)
            {
                query = query.Where(u => u.IsPermanentlySuspended || (u.SuspendedUntil.HasValue && u.SuspendedUntil > DateTime.UtcNow));
            }
            else
            {
                query = query.Where(u => !u.IsPermanentlySuspended && (!u.SuspendedUntil.HasValue || u.SuspendedUntil <= DateTime.UtcNow));
            }
        }

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderBy(u => u.FullName)
            .Skip((filter.PageNumber - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .ToListAsync();

        return new PagedResultDto<Models.User>(items, totalCount, filter.PageNumber, filter.PageSize);
    }

    public async Task UpdateUserSkillsAsync(int userId, List<string> skills)
    {
        var existingSkills = await _db.UserSkills.Where(s => s.UserId == userId).ToListAsync();
        _db.UserSkills.RemoveRange(existingSkills);

        var distinctSkills = skills
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Select(s => s.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase);

        foreach (var skill in distinctSkills)
        {
            _db.UserSkills.Add(new UserSkill
            {
                UserId = userId,
                Skill = skill
            });
        }

        await _db.SaveChangesAsync();
    }

    public async Task UpdateUserInterestsAsync(int userId, List<string> interests)
    {
        var existingInterests = await _db.UserInterests.Where(i => i.UserId == userId).ToListAsync();
        _db.UserInterests.RemoveRange(existingInterests);

        var distinctInterests = interests
            .Where(i => !string.IsNullOrWhiteSpace(i))
            .Select(i => i.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase);

        foreach (var interest in distinctInterests)
        {
            _db.UserInterests.Add(new UserInterest
            {
                UserId = userId,
                Interest = interest
            });
        }

        await _db.SaveChangesAsync();
    }

    public async Task UpdateUserRolesAsync(int userId, List<string> roleNames)
    {
        var user = await _db.Users.Include(u => u.Roles).FirstOrDefaultAsync(u => u.UserId == userId);
        if (user == null)
            throw new NotFoundException($"User with ID {userId} not found.");

        user.Roles.Clear();

        foreach (var roleName in roleNames.Distinct())
        {
            var role = await _db.Roles.FirstOrDefaultAsync(r => r.RoleName == roleName);
            if (role == null)
                throw new BadRequestException($"Role '{roleName}' does not exist in the database.");

            user.Roles.Add(role);
        }

        await _db.SaveChangesAsync();
    }

    public async Task<int> GetMutualConnectionsCountAsync(int userId1, int userId2)
    {
        if (userId1 == userId2)
            return 0;

        var user1Following = _db.Followers
            .Where(f => f.FollowerUserId == userId1)
            .Select(f => f.FollowingUserId);

        var user2Following = _db.Followers
            .Where(f => f.FollowerUserId == userId2)
            .Select(f => f.FollowingUserId);

        return await user1Following.Intersect(user2Following).CountAsync();
    }

    public async Task<bool> DepartmentExistsAsync(int departmentId)
    {
        return await _db.Departments.AnyAsync(d => d.DepartmentId == departmentId);
    }

    public async Task<List<int>> GetAllActiveUserIdsAsync()
    {
        return await _db.Users
            .Where(u => u.IsActive && !u.IsPermanentlySuspended)
            .Select(u => u.UserId)
            .ToListAsync();
    }

    public async Task<bool> IsFollowingAsync(int followerUserId, int followingUserId)
    {
        return await _db.Followers.AnyAsync(f => f.FollowerUserId == followerUserId && f.FollowingUserId == followingUserId);
    }

    public async Task AddFollowerAsync(int followerUserId, int followingUserId)
    {
        _db.Followers.Add(new Models.Follower
        {
            FollowerUserId = followerUserId,
            FollowingUserId = followingUserId
        });
        await _db.SaveChangesAsync();
    }

    public async Task RemoveFollowerAsync(int followerUserId, int followingUserId)
    {
        var follow = await _db.Followers
            .FirstOrDefaultAsync(f => f.FollowerUserId == followerUserId && f.FollowingUserId == followingUserId);
        if (follow != null)
        {
            _db.Followers.Remove(follow);
            await _db.SaveChangesAsync();
        }
    }

    public async Task SaveChangesAsync()
    {
        await _db.SaveChangesAsync();
    }
}
