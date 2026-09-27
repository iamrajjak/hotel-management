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
        var hotelId = _tenantContext?.HotelId.HasValue == true ? _tenantContext.HotelId.Value : Guid.Empty;
        string? filterHotelId = !isSuperAdmin && hotelId != Guid.Empty ? hotelId.ToString() : null;

        var resultList = new List<CustomerDto>();
        var seenKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        // 1. Fetch live customers from Turso Cloud DB
        try
        {
            var tursoCustomers = await _tursoSync.FetchCustomersFromTursoAsync(filterHotelId);
            if (tursoCustomers != null)
            {
                foreach (var c in tursoCustomers)
                {
                    var key = !string.IsNullOrEmpty(c.Phone) ? c.Phone : c.Id.ToString();
                    if (!seenKeys.Contains(key))
                    {
                        seenKeys.Add(key);
                        resultList.Add(c);
                    }
                }
            }
        }
        catch { }

        // 2. Query local DB
        var query = _db.Customers.Include(c => c.Reservations).AsNoTracking().AsQueryable();
        if (!isSuperAdmin && hotelId != Guid.Empty)
        {
            query = query.Where(c => c.HotelId == hotelId);
        }

        var localCustomers = await query.OrderByDescending(c => c.CreatedAt).ToListAsync();
        foreach (var lc in localCustomers)
        {
            var key = !string.IsNullOrEmpty(lc.Phone) ? lc.Phone : lc.Id.ToString();
            if (!seenKeys.Contains(key))
            {
                seenKeys.Add(key);
                resultList.Add(MapToDto(lc));
            }
        }

        return ApiResponse<List<CustomerDto>>.Ok(resultList);
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

    public async Task<ApiResponse<bool>> DeleteCustomerAsync(string id)
    {
        var target = (id ?? "").Trim();
        var safeTarget = target.Replace("'", "''");
        Guid.TryParse(target, out var parsedGuid);
        var idStr = parsedGuid != Guid.Empty ? parsedGuid.ToString() : target;
        var detGuidStr = parsedGuid != Guid.Empty ? parsedGuid.ToString("N") : target;

        try
        {
            var tursoCustomers = await _tursoSync.FetchCustomersFromTursoAsync();
            if (tursoCustomers != null)
            {
                var matches = tursoCustomers.Where(c => 
                    c.Id == parsedGuid || 
                    c.Id.ToString().Equals(target, StringComparison.OrdinalIgnoreCase) ||
                    (!string.IsNullOrEmpty(c.Phone) && c.Phone.Equals(target, StringComparison.OrdinalIgnoreCase)) ||
                    (!string.IsNullOrEmpty(c.Email) && c.Email.Equals(target, StringComparison.OrdinalIgnoreCase)) ||
                    (!string.IsNullOrEmpty(c.FullName) && c.FullName.Equals(target, StringComparison.OrdinalIgnoreCase))
                ).ToList();

                foreach (var match in matches)
                {
                    if (!string.IsNullOrEmpty(match.Email))
                        await _tursoSync.ExecuteSqlAsync($"DELETE FROM customers WHERE email = '{match.Email.Replace("'", "''")}';");
                    if (!string.IsNullOrEmpty(match.Phone))
                        await _tursoSync.ExecuteSqlAsync($"DELETE FROM customers WHERE phone = '{match.Phone.Replace("'", "''")}';");
                    if (!string.IsNullOrEmpty(match.FullName))
                        await _tursoSync.ExecuteSqlAsync($"DELETE FROM customers WHERE full_name = '{match.FullName.Replace("'", "''")}';");
                }
            }
        }
        catch { }

        // Execute direct deletion by raw ID, GUID, phone, email, or full name on Turso
        await _tursoSync.ExecuteSqlAsync($"DELETE FROM customers WHERE id = '{safeTarget}' OR id = '{idStr}' OR id = 'cust-{safeTarget}' OR phone = '{safeTarget}' OR email = '{safeTarget}' OR full_name = '{safeTarget}' OR id LIKE '%{detGuidStr}%';");

        // Clean local DB with IgnoreQueryFilters & PRAGMA foreign_keys = OFF to guarantee deletion
        try
        {
            await _db.Database.ExecuteSqlRawAsync("PRAGMA foreign_keys = OFF;");
            var cList = await _db.Customers.IgnoreQueryFilters().Where(cust => cust.Id == parsedGuid || cust.Id.ToString() == target || cust.Email == target || cust.Phone == target || cust.FullName == target).ToListAsync();
            foreach (var c in cList)
            {
                var resList = await _db.Reservations.IgnoreQueryFilters().Where(r => r.CustomerId == c.Id).ToListAsync();
                foreach (var res in resList)
                {
                    var invoices = await _db.Invoices.IgnoreQueryFilters().Where(i => i.ReservationId == res.Id).ToListAsync();
                    var payments = await _db.Payments.IgnoreQueryFilters().Where(p => p.ReservationId == res.Id).ToListAsync();
                    var posOrders = await _db.PosOrders.IgnoreQueryFilters().Where(p => p.ReservationId == res.Id).ToListAsync();
                    foreach (var po in posOrders)
                    {
                        var poItems = await _db.PosOrderItems.IgnoreQueryFilters().Where(poi => poi.OrderId == po.Id).ToListAsync();
                        _db.PosOrderItems.RemoveRange(poItems);
                    }
                    _db.PosOrders.RemoveRange(posOrders);

                    _db.Invoices.RemoveRange(invoices);
                    _db.Payments.RemoveRange(payments);
                    _db.Reservations.Remove(res);
                }
                _db.Customers.Remove(c);
            }
            await _db.SaveChangesAsync();
            await _db.Database.ExecuteSqlRawAsync("PRAGMA foreign_keys = ON;");
        }
        catch
        {
            try
            {
                await _db.Database.ExecuteSqlRawAsync("PRAGMA foreign_keys = OFF;");
                await _db.Database.ExecuteSqlRawAsync($"DELETE FROM Customers WHERE Id = '{safeTarget}' OR Phone = '{safeTarget}' OR Email = '{safeTarget}' OR FullName = '{safeTarget}';");
                await _db.Database.ExecuteSqlRawAsync("PRAGMA foreign_keys = ON;");
            }
            catch { }
        }

        return ApiResponse<bool>.Ok(true, "Customer profile deleted successfully");
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
