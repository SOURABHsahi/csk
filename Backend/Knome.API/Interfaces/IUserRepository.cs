using System.Collections.Generic;
using System.Threading.Tasks;
using Knome.API.DTOs.User;

namespace Knome.API.Interfaces;

/// <summary>
/// Feature repository contract for User operations that require eager loading,
/// complex filtering, and many-to-many collection management.
/// Extends data access cleanly beyond generic CRUD without leaking EF Core abstractions.
/// </summary>
public interface IUserRepository : IRepository<Models.User>
{
    Task<Models.User?> GetProfileByIdAsync(int userId);
    Task<PagedResultDto<Models.User>> GetPagedUsersAsync(UserFilterDto filter);
    Task UpdateUserSkillsAsync(int userId, List<string> skills);
    Task UpdateUserInterestsAsync(int userId, List<string> interests);
    Task UpdateUserRolesAsync(int userId, List<string> roleNames);
    Task<int> GetMutualConnectionsCountAsync(int userId1, int userId2);
    Task<bool> DepartmentExistsAsync(int departmentId);
    Task<List<int>> GetAllActiveUserIdsAsync();
    Task<bool> IsFollowingAsync(int followerUserId, int followingUserId);
    Task AddFollowerAsync(int followerUserId, int followingUserId);
    Task RemoveFollowerAsync(int followerUserId, int followingUserId);
    Task SaveChangesAsync();
}
