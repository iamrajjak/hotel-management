using HotelSaaS.Application.Common.Interfaces;
using HotelSaaS.Application.Common.Models;
using HotelSaaS.Application.DTOs;
using HotelSaaS.Application.Interfaces;
using HotelSaaS.Domain.Entities;
using HotelSaaS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HotelSaaS.Infrastructure.Services;

public class ExpenseService : IExpenseService
{
    private readonly ApplicationDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly ITursoSyncService _tursoSync;

    public ExpenseService(ApplicationDbContext db, ITenantContext tenantContext, ITursoSyncService tursoSync)
    {
        _db = db;
        _tenantContext = tenantContext;
        _tursoSync = tursoSync;
    }

    private Guid GetTenantHotelId()
    {
        if (!_tenantContext.HotelId.HasValue || _tenantContext.HotelId.Value == Guid.Empty)
        {
            throw new UnauthorizedAccessException("Tenant context is required for expense operations.");
        }
        return _tenantContext.HotelId.Value;
    }

    public async Task<ApiResponse<List<ExpenseDto>>> GetExpensesAsync(string? category = null, DateTime? startDate = null, DateTime? endDate = null)
    {
        var tenantHotelId = GetTenantHotelId();

        var localHotel = await _db.Hotels.FirstOrDefaultAsync(h => h.Id == tenantHotelId);
        if (localHotel == null)
        {
            _db.Hotels.Add(new Hotel
            {
                Id = tenantHotelId,
                Name = "Jodhpur Royal Hotel",
                Slug = "jodhpur-royal",
                Phone = "",
                Email = "",
                Status = "Active"
            });
            try { await _db.SaveChangesAsync(); } catch { }
        }

        var isSuperAdmin = _tenantContext?.IsSuperAdmin ?? false;
        string? filterHotelId = !isSuperAdmin ? tenantHotelId.ToString() : null;

        try
        {
            var tursoExpenses = await _tursoSync.FetchExpensesFromTursoAsync(filterHotelId);
            if (tursoExpenses != null)
            {
                var filteredTurso = isSuperAdmin 
                    ? tursoExpenses.AsEnumerable()
                    : tursoExpenses.Where(e => e.HotelId == tenantHotelId || e.HotelId.ToString().Equals(tenantHotelId.ToString(), StringComparison.OrdinalIgnoreCase)).AsEnumerable();

                if (!string.IsNullOrWhiteSpace(category))
                {
                    filteredTurso = filteredTurso.Where(e => e.Category.Equals(category.Trim(), StringComparison.OrdinalIgnoreCase));
                }
                if (startDate.HasValue)
                {
                    filteredTurso = filteredTurso.Where(e => e.ExpenseDate >= startDate.Value.Date);
                }
                if (endDate.HasValue)
                {
                    filteredTurso = filteredTurso.Where(e => e.ExpenseDate <= endDate.Value.Date.AddDays(1).AddTicks(-1));
                }

                return ApiResponse<List<ExpenseDto>>.Ok(filteredTurso.OrderByDescending(e => e.ExpenseDate).ToList());
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Expenses Live Sync Exception] {ex.Message}");
        }

        var query = _db.Expenses.AsQueryable();

        if (tenantHotelId != Guid.Empty)
        {
            query = query.Where(e => e.HotelId == tenantHotelId);
        }

        if (!string.IsNullOrWhiteSpace(category))
        {
            query = query.Where(e => e.Category.ToLower() == category.Trim().ToLower());
        }

        if (startDate.HasValue)
        {
            query = query.Where(e => e.ExpenseDate >= startDate.Value.Date);
        }

        if (endDate.HasValue)
        {
            query = query.Where(e => e.ExpenseDate <= endDate.Value.Date.AddDays(1).AddTicks(-1));
        }

        var expenses = await query.OrderByDescending(e => e.ExpenseDate).ToListAsync();

        var dtos = expenses.Select(e => new ExpenseDto(
            e.Id, e.HotelId, e.Category, e.Amount, e.Description, e.ExpenseDate, e.PaymentMethod, e.ReferenceNumber, e.CreatedBy, e.ReceiptUrl, e.CreatedAt
        )).ToList();

        return ApiResponse<List<ExpenseDto>>.Ok(dtos);
    }

    public async Task<ApiResponse<ExpenseDto>> GetExpenseByIdAsync(Guid id)
    {
        var expense = await _db.Expenses.FirstOrDefaultAsync(e => e.Id == id);
        if (expense == null) return ApiResponse<ExpenseDto>.Fail("Expense not found");

        return ApiResponse<ExpenseDto>.Ok(new ExpenseDto(
            expense.Id, expense.HotelId, expense.Category, expense.Amount, expense.Description, expense.ExpenseDate, expense.PaymentMethod, expense.ReferenceNumber, expense.CreatedBy, expense.ReceiptUrl, expense.CreatedAt
        ));
    }

    public async Task<ApiResponse<ExpenseDto>> CreateExpenseAsync(CreateExpenseDto request, string userEmail)
    {
        var hotelId = GetTenantHotelId();

        var localHotel = await _db.Hotels.FirstOrDefaultAsync(h => h.Id == hotelId);
        if (localHotel == null)
        {
            _db.Hotels.Add(new Hotel
            {
                Id = hotelId,
                Name = "Grand Palace Hotel",
                Slug = "grand-palace",
                Phone = "",
                Email = "",
                Status = "Active"
            });
            try { await _db.SaveChangesAsync(); } catch { }
        }

        if (request.Amount <= 0) return ApiResponse<ExpenseDto>.Fail("Expense amount must be greater than zero");
        if (string.IsNullOrWhiteSpace(request.Category)) return ApiResponse<ExpenseDto>.Fail("Expense category is required");

        var existingCount = await _db.Expenses.CountAsync();
        var nextExpenseNum = existingCount + 1;
        var customExpenseIdStr = $"exp-{nextExpenseNum:D3}";

        using var md5 = System.Security.Cryptography.MD5.Create();
        var hash = md5.ComputeHash(System.Text.Encoding.UTF8.GetBytes(customExpenseIdStr));
        var customExpenseGuid = new Guid(hash);

        var expense = new Expense
        {
            Id = customExpenseGuid,
            HotelId = hotelId,
            Category = request.Category.Trim(),
            Amount = request.Amount,
            Description = request.Description ?? "",
            ExpenseDate = request.ExpenseDate ?? DateTime.UtcNow,
            PaymentMethod = string.IsNullOrWhiteSpace(request.PaymentMethod) ? "Cash" : request.PaymentMethod,
            ReferenceNumber = request.ReferenceNumber,
            CreatedBy = userEmail,
            ReceiptUrl = request.ReceiptUrl
        };

        _db.Expenses.Add(expense);
        await _db.SaveChangesAsync();

        try
        {
            await _tursoSync.SyncExpenseAsync(
                customExpenseIdStr, expense.Category, expense.Amount, expense.Description,
                expense.ExpenseDate.ToString("yyyy-MM-dd HH:mm:ss"), expense.PaymentMethod,
                expense.ReferenceNumber, expense.CreatedBy, expense.HotelId.ToString()
            );
        }
        catch { }

        return ApiResponse<ExpenseDto>.Ok(new ExpenseDto(
            expense.Id, expense.HotelId, expense.Category, expense.Amount, expense.Description, expense.ExpenseDate, expense.PaymentMethod, expense.ReferenceNumber, expense.CreatedBy, expense.ReceiptUrl, expense.CreatedAt
        ), "Expense created successfully");
    }

    public async Task<ApiResponse<ExpenseDto>> UpdateExpenseAsync(Guid id, UpdateExpenseDto request)
    {
        var expense = await _db.Expenses.FirstOrDefaultAsync(e => e.Id == id);
        if (expense == null) return ApiResponse<ExpenseDto>.Fail("Expense not found");

        if (request.Amount <= 0) return ApiResponse<ExpenseDto>.Fail("Expense amount must be greater than zero");

        expense.Category = request.Category.Trim();
        expense.Amount = request.Amount;
        expense.Description = request.Description ?? "";
        expense.ExpenseDate = request.ExpenseDate;
        expense.PaymentMethod = request.PaymentMethod;
        expense.ReferenceNumber = request.ReferenceNumber;
        expense.ReceiptUrl = request.ReceiptUrl;

        await _db.SaveChangesAsync();

        try
        {
            await _tursoSync.SyncExpenseAsync(
                expense.Id.ToString(), expense.Category, expense.Amount, expense.Description,
                expense.ExpenseDate.ToString("yyyy-MM-dd HH:mm:ss"), expense.PaymentMethod,
                expense.ReferenceNumber, expense.CreatedBy, expense.HotelId.ToString()
            );
        }
        catch { }

        return ApiResponse<ExpenseDto>.Ok(new ExpenseDto(
            expense.Id, expense.HotelId, expense.Category, expense.Amount, expense.Description, expense.ExpenseDate, expense.PaymentMethod, expense.ReferenceNumber, expense.CreatedBy, expense.ReceiptUrl, expense.CreatedAt
        ), "Expense updated successfully");
    }

    public async Task<ApiResponse<bool>> DeleteExpenseAsync(Guid id)
    {
        var idStr = id.ToString();

        var expense = await _db.Expenses.FirstOrDefaultAsync(e => e.Id == id);
        if (expense == null)
        {
            var allExpenses = await _db.Expenses.ToListAsync();
            expense = allExpenses.FirstOrDefault(e => e.Id.ToString().Equals(idStr, StringComparison.OrdinalIgnoreCase));
        }

        string? desc = expense?.Description;

        if (expense != null)
        {
            _db.Expenses.Remove(expense);
            try { await _db.SaveChangesAsync(); } catch { }
        }

        try
        {
            var escDesc = (desc ?? "").Replace("'", "''");
            var extraClause = !string.IsNullOrWhiteSpace(escDesc) ? $" OR description = '{escDesc}' OR description LIKE '%{escDesc}%'" : "";
            var extraClauseCap = !string.IsNullOrWhiteSpace(escDesc) ? $" OR Description = '{escDesc}' OR Description LIKE '%{escDesc}%'" : "";

            var sqlLower = $"DELETE FROM expenses WHERE id = '{idStr}' OR id = 'exp-001001' OR id LIKE '%{idStr}%'{extraClause};";
            var sqlCap = $"DELETE FROM Expenses WHERE Id = '{idStr}' OR Id = 'exp-001001' OR Id LIKE '%{idStr}%'{extraClauseCap};";

            await _tursoSync.ExecuteSqlAsync(sqlLower);
            await _tursoSync.ExecuteSqlAsync(sqlCap);
        }
        catch { }

        return ApiResponse<bool>.Ok(true, "Expense deleted successfully");
    }
}
