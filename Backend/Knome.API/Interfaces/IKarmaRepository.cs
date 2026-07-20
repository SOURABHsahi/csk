using System.Collections.Generic;
using System.Threading.Tasks;
using Knome.API.Models;

namespace Knome.API.Interfaces;

public interface IKarmaRepository
{
    Task<KarmaBalance?> GetBalanceByUserIdAsync(int userId);
    Task<KarmaBalance> GetOrCreateBalanceAsync(int userId);
    Task AddTransactionAsync(KarmaTransaction transaction);
    Task UpdateBalanceAsync(KarmaBalance balance);
    Task<List<KarmaTransaction>> GetRecentTransactionsAsync(int userId, int limit);
    Task<List<KarmaBalance>> GetTopBalancesAsync(int top);
}
