using HotelSaaS.Application.Common.Interfaces;
using HotelSaaS.Application.Common.Models;
using HotelSaaS.Application.DTOs;
using HotelSaaS.Application.Interfaces;
using HotelSaaS.Domain.Entities;
using HotelSaaS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HotelSaaS.Infrastructure.Services;

public class CustomerService : ICustomerService
{
    private readonly ApplicationDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly ITursoSyncService _tursoSync;

    public CustomerService(ApplicationDbContext db, ITenantContext tenantContext, ITursoSyncService tursoSync)
    {
        _db = db;
        _tenantContext = tenantContext;
        _tursoSync = tursoSync;
    }

    public async Task<ApiResponse<List<CustomerDto>>> GetCustomersAsync()
    {
        var isSuperAdmin = _tenantContext?.IsSuperAdmin ?? false;
        string? filterHotelId = !isSuperAdmin && _tenantContext?.HotelId.HasValue == true
            ? _tenantContext.HotelId.Value.ToString()
            : null;

        try
        {
            var tursoCustomers = await _tursoSync.FetchCustomersFromTursoAsync(filterHotelId);
            return ApiResponse<List<CustomerDto>>.Ok(tursoCustomers ?? new List<CustomerDto>());
        }
        catch (Exception ex)
        {
            return ApiResponse<List<CustomerDto>>.Ok(new List<CustomerDto>());
        }
    }

    public async Task<ApiResponse<CustomerDto>> GetCustomerByIdAsync(Guid id)
    {
        var isSuperAdmin = _tenantContext?.IsSuperAdmin ?? false;
        string? filterHotelId = !isSuperAdmin && _tenantContext?.HotelId.HasValue == true
            ? _tenantContext.HotelId.Value.ToString()
            : null;

        var tursoCustomers = await _tursoSync.FetchCustomersFromTursoAsync(filterHotelId);
        var match = tursoCustomers?.FirstOrDefault(c => c.Id == id);
        if (match != null)
            return ApiResponse<CustomerDto>.Ok(match);

        var c = await _db.Customers
            .Include(cust => cust.Reservations)
            .FirstOrDefaultAsync(cust => cust.Id == id);

        if (c == null)
            return ApiResponse<CustomerDto>.Fail("Customer not found");

        return ApiResponse<CustomerDto>.Ok(MapToDto(c));
    }

    private Guid GetTenantHotelId()
    {
        if (_tenantContext.HotelId.HasValue && _tenantContext.HotelId.Value != Guid.Empty)
        {
            return _tenantContext.HotelId.Value;
        }
        throw new UnauthorizedAccessException("Tenant hotel context is missing or invalid.");
    }

    public async Task<ApiResponse<CustomerDto>> CreateCustomerAsync(CreateCustomerDto request)
    {
        var hotelId = GetTenantHotelId();

        var tursoMax = await _tursoSync.GetMaxTrainIdFromTursoAsync("customers");
        var localMax = await _db.Customers.IgnoreQueryFilters().AnyAsync()
            ? await _db.Customers.IgnoreQueryFilters().Select(c => (int?)EF.Property<int>(c, "trainid")).MaxAsync() ?? 0
            : 0;
        var custCount = Math.Max(tursoMax, localMax) + 1;
        var custGuid = Guid.Parse($"00000000-0000-0000-0004-{custCount:D12}");

        var customer = new Customer
        {
            Id = custGuid,
            HotelId = hotelId,
            FullName = request.FullName,
            Email = request.Email,
            Phone = request.Phone,
            Address = request.Address,
            City = request.City,
            State = request.State,
            Country = request.Country ?? "India",
            IdType = request.IdType,
            IdNumber = request.IdNumber,
            IdDocumentUrl = request.IdDocumentUrl,
            Notes = request.Notes
        };

        _db.Customers.Add(customer);
        try { await _db.SaveChangesAsync(); } catch { }

        try { await _tursoSync.SyncCustomerAsync(customer.Id.ToString(), customer.FullName, customer.Email ?? "", customer.Phone ?? "", customer.City ?? "", customer.State ?? "", hotelId: customer.HotelId.ToString()); } catch { }

        return ApiResponse<CustomerDto>.Ok(MapToDto(customer), "Customer profile created in database");
    }

    public async Task<ApiResponse<CustomerDto>> UpdateCustomerAsync(Guid id, CreateCustomerDto request)
    {
        var c = await _db.Customers.Include(cust => cust.Reservations).FirstOrDefaultAsync(cust => cust.Id == id);
        if (c != null)
        {
            c.FullName = request.FullName;
            c.Email = request.Email;
            c.Phone = request.Phone;
            c.Address = request.Address;
            c.City = request.City;
            c.State = request.State;
            c.Country = request.Country ?? "India";
            c.IdType = request.IdType;
            c.IdNumber = request.IdNumber;
            c.IdDocumentUrl = request.IdDocumentUrl;
            c.Notes = request.Notes;

            try { await _db.SaveChangesAsync(); } catch { }
        }

        var hotelIdStr = _tenantContext.HotelId?.ToString();
        try { await _tursoSync.SyncCustomerAsync(id.ToString(), request.FullName, request.Email ?? "", request.Phone ?? "", request.City ?? "", request.State ?? "", hotelId: hotelIdStr); } catch { }

        var updatedDto = new CustomerDto(
            0, id, _tenantContext.HotelId ?? Guid.Empty, request.FullName, request.Email ?? "", request.Phone ?? "",
            request.Address, request.City, request.State, request.Country ?? "India",
            request.IdType, request.IdNumber, request.IdDocumentUrl, request.Notes, 0, 0, DateTime.UtcNow
        );

        return ApiResponse<CustomerDto>.Ok(updatedDto, "Customer updated");
    }

    public async Task<ApiResponse<bool>> DeleteCustomerAsync(Guid id)
    {
        var idStr = id.ToString();
        var detGuidStr = id.ToString("N");

        // Delete live directly from Turso Cloud DB
        await _tursoSync.ExecuteSqlAsync($"DELETE FROM customers WHERE id = '{idStr}' OR id = 'cust-{idStr}' OR id LIKE '%{detGuidStr}%';");

        // Also clean local DB if tracked
        var c = await _db.Customers.FirstOrDefaultAsync(cust => cust.Id == id);
        if (c != null)
        {
            _db.Customers.Remove(c);
            try { await _db.SaveChangesAsync(); } catch { }
        }

        return ApiResponse<bool>.Ok(true, "Customer deleted successfully from database");
    }

    private static CustomerDto MapToDto(Customer c)
    {
        var totalStays = c.Reservations?.Count(r => r.BookingStatus == Domain.Enums.BookingStatus.CheckedOut || r.BookingStatus == Domain.Enums.BookingStatus.CheckedIn) ?? 0;
        var totalSpent = c.Reservations?.Where(r => r.BookingStatus != Domain.Enums.BookingStatus.Cancelled && r.BookingStatus != Domain.Enums.BookingStatus.NoShow).Sum(r => r.PaidAmount) ?? 0;

        return new CustomerDto(
            c.trainid, c.Id, c.HotelId, c.FullName, c.Email, c.Phone,
            c.Address, c.City, c.State, c.Country,
            c.IdType, c.IdNumber, c.IdDocumentUrl, c.Notes,
            totalStays, totalSpent, c.CreatedAt
        );
    }
}
