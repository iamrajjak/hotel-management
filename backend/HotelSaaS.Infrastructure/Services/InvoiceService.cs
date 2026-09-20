using HotelSaaS.Application.Common.Interfaces;
using HotelSaaS.Application.Common.Models;
using HotelSaaS.Application.DTOs;
using HotelSaaS.Application.Interfaces;
using HotelSaaS.Domain.Entities;
using HotelSaaS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HotelSaaS.Infrastructure.Services;

public class InvoiceService : IInvoiceService
{
    private readonly ApplicationDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly ITursoSyncService _tursoSync;

    public InvoiceService(ApplicationDbContext db, ITenantContext tenantContext, ITursoSyncService tursoSync)
    {
        _db = db;
        _tenantContext = tenantContext;
        _tursoSync = tursoSync;
    }

    public async Task<ApiResponse<List<InvoiceDto>>> GetInvoicesAsync()
    {
        var currentHotelId = _tenantContext.HotelId;
        var isSuperAdmin = _tenantContext.IsSuperAdmin;

        var dbInvoices = await _db.Invoices
            .Include(i => i.Reservation)
            .Include(i => i.Customer)
            .Include(i => i.Payments)
            .OrderByDescending(i => i.IssuedAt)
            .ToListAsync();

        var resultList = dbInvoices.Select(MapToDto).ToList();
        var existingResIds = resultList.Select(i => i.ReservationId).ToHashSet();

        // Fetch live reservations to synthesize invoices for any booking without an explicit invoice
        var tursoReservations = await _tursoSync.FetchReservationsFromTursoAsync();
        foreach (var r in tursoReservations)
        {
            // Multi-tenant check: Skip reservations that do not belong to current hotel!
            if (!isSuperAdmin && currentHotelId.HasValue && currentHotelId.Value != Guid.Empty && r.HotelId != currentHotelId.Value)
            {
                continue;
            }

            if (!existingResIds.Contains(r.Id))
            {
                existingResIds.Add(r.Id);
                var cleanBooking = r.BookingNumber.StartsWith("res-", StringComparison.OrdinalIgnoreCase) ? r.BookingNumber.Substring(4) : r.BookingNumber;
                var invNum = "INV-" + (cleanBooking.StartsWith("RES-", StringComparison.OrdinalIgnoreCase) ? cleanBooking : "RES-" + cleanBooking);
                
                resultList.Add(new InvoiceDto(
                    r.Id,
                    r.HotelId,
                    r.Id,
                    cleanBooking,
                    r.CustomerId,
                    r.CustomerName,
                    r.CustomerPhone,
                    r.CustomerEmail,
                    invNum,
                    r.TotalAmount,
                    0,
                    0,
                    r.TotalAmount,
                    r.PaidAmount > 0 ? r.PaidAmount : r.TotalAmount,
                    r.DueAmount,
                    r.DueAmount <= 0 ? "Paid" : "Pending",
                    r.CheckInDate,
                    new List<PaymentDto>()
                ));
            }
        }

        return ApiResponse<List<InvoiceDto>>.Ok(resultList);
    }

    public async Task<ApiResponse<InvoiceDto>> GetInvoiceByIdAsync(Guid id)
    {
        var invs = await GetInvoicesAsync();
        var found = invs.Data?.FirstOrDefault(i => i.Id == id);
        if (found != null)
            return ApiResponse<InvoiceDto>.Ok(found);

        return ApiResponse<InvoiceDto>.Fail("Invoice not found");
    }

    public async Task<ApiResponse<InvoiceDto>> GetInvoiceByReservationIdAsync(Guid reservationId)
    {
        var invs = await GetInvoicesAsync();
        var found = invs.Data?.FirstOrDefault(i => i.ReservationId == reservationId);
        if (found != null)
            return ApiResponse<InvoiceDto>.Ok(found);

        return ApiResponse<InvoiceDto>.Fail("Invoice not found for this reservation");
    }

    private static InvoiceDto MapToDto(Invoice i) => new(
        i.Id,
        i.HotelId,
        i.ReservationId,
        i.Reservation?.BookingNumber ?? "",
        i.CustomerId,
        i.Customer?.FullName ?? "Guest",
        i.Customer?.Phone ?? "",
        i.Customer?.Email ?? "",
        i.InvoiceNumber,
        i.Subtotal,
        i.Discount,
        i.Tax,
        i.Total,
        i.Paid,
        i.Due,
        i.Status,
        i.IssuedAt,
        i.Payments?.Select(p => new PaymentDto(
            p.Id, p.HotelId, p.ReservationId, p.InvoiceId, p.Amount,
            p.PaymentMethod, p.TransactionId, p.PaymentStatus, p.PaymentDate, p.Notes
        )).ToList() ?? new List<PaymentDto>()
    );
}
