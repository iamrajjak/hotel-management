using HotelSaaS.Application.Common.Models;
using HotelSaaS.Application.DTOs;

namespace HotelSaaS.Application.Interfaces;

public interface IExpenseService
{
    Task<ApiResponse<List<ExpenseDto>>> GetExpensesAsync(string? category = null, DateTime? startDate = null, DateTime? endDate = null);
    Task<ApiResponse<ExpenseDto>> GetExpenseByIdAsync(Guid id);
    Task<ApiResponse<ExpenseDto>> CreateExpenseAsync(CreateExpenseDto request, string userEmail);
    Task<ApiResponse<ExpenseDto>> UpdateExpenseAsync(Guid id, UpdateExpenseDto request);
    Task<ApiResponse<bool>> DeleteExpenseAsync(Guid id);
}
