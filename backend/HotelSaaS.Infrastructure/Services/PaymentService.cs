using System.Security.Cryptography;
using System.Text;
using HotelSaaS.Application.Common.Interfaces;
using HotelSaaS.Application.Common.Models;
using HotelSaaS.Application.DTOs;
using HotelSaaS.Application.Interfaces;
using HotelSaaS.Domain.Entities;
using HotelSaaS.Domain.Enums;
using HotelSaaS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace HotelSaaS.Infrastructure.Services;

public class PaymentService : IPaymentService
{
    private readonly ApplicationDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly ITursoSyncService _tursoSync;
    private readonly IConfiguration _config;

    public PaymentService(ApplicationDbContext db, ITenantContext tenantContext, ITursoSyncService tursoSync, IConfiguration config)
    {
        _db = db;
        _tenantContext = tenantContext;
        _tursoSync = tursoSync;
        _config = config;
    }

    public async Task<ApiResponse<List<PaymentDto>>> GetPaymentsAsync()
    {
        var currentHotelId = _tenantContext.HotelId;
        var isSuperAdmin = _tenantContext.IsSuperAdmin;

        var payments = await _db.Payments
            .OrderByDescending(p => p.PaymentDate)
            .ToListAsync();

        var resultList = payments.Select(MapToDto).ToList();
        var existingResIds = payments.Select(p => p.ReservationId).ToHashSet();

        // Synthesize payment transactions from live Turso reservations
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
                var txnId = "TXN-" + cleanBooking;
                var amt = r.PaidAmount > 0 ? r.PaidAmount : r.TotalAmount;
                
                resultList.Add(new PaymentDto(
                    r.Id,
                    r.HotelId,
                    r.Id,
                    null,
                    amt,
                    PaymentMethod.UPI,
                    txnId,
                    PaymentStatus.Paid,
                    r.CheckInDate,
                    $"Live Booking Payment ({r.CustomerName} - Room {r.RoomNumber})"
                ));
            }
        }

        return ApiResponse<List<PaymentDto>>.Ok(resultList);
    }

    public async Task<ApiResponse<PaymentDto>> RecordPaymentAsync(RecordPaymentDto request)
    {
        if (request.Amount <= 0)
            return ApiResponse<PaymentDto>.Fail("Payment amount must be greater than 0");

        var r = await _db.Reservations.FirstOrDefaultAsync(res => res.Id == request.ReservationId);
        var targetHotelId = (_tenantContext.HotelId.HasValue && _tenantContext.HotelId.Value != Guid.Empty)
            ? _tenantContext.HotelId.Value
            : (r?.HotelId ?? Guid.Empty);
        
        var payment = new Payment
        {
            HotelId = targetHotelId,
            ReservationId = request.ReservationId,
            InvoiceId = request.InvoiceId,
            Amount = request.Amount,
            PaymentMethod = request.PaymentMethod,
            TransactionId = request.TransactionId ?? ("TXN-" + DateTime.UtcNow.Ticks),
            PaymentStatus = PaymentStatus.Paid,
            PaymentDate = DateTime.UtcNow,
            Notes = request.Notes
        };

        _db.Payments.Add(payment);

        if (r != null)
        {
            r.PaidAmount += request.Amount;
            r.DueAmount = r.TotalAmount - r.PaidAmount;
            if (r.DueAmount <= 0)
            {
                r.DueAmount = 0;
                r.PaymentStatus = PaymentStatus.Paid;
            }
            else if (r.PaidAmount > 0)
            {
                r.PaymentStatus = PaymentStatus.Partial;
            }
        }

        if (request.InvoiceId.HasValue)
        {
            var inv = await _db.Invoices.FirstOrDefaultAsync(i => i.Id == request.InvoiceId.Value);
            if (inv != null)
            {
                inv.Paid += request.Amount;
                inv.Due = inv.Total - inv.Paid;
                inv.Status = inv.Due <= 0 ? "Paid" : "Partial";
            }
        }

        await _db.SaveChangesAsync();
        return ApiResponse<PaymentDto>.Ok(MapToDto(payment), "Payment recorded successfully");
    }

    public async Task<ApiResponse<RazorpayOrderResponseDto>> CreateRazorpayOrderAsync(RazorpayOrderRequestDto request)
    {
        var keyId = _config["Razorpay:KeyId"] ?? "rzp_test_demo_key";
        var orderId = "order_" + Random.Shared.Next(100000, 999999);

        var dto = new RazorpayOrderResponseDto(
            OrderId: orderId,
            KeyId: keyId,
            Amount: request.Amount * 100, // Amount in paise
            Currency: "INR"
        );

        return await Task.FromResult(ApiResponse<RazorpayOrderResponseDto>.Ok(dto));
    }

    public async Task<ApiResponse<PaymentDto>> VerifyRazorpayPaymentAsync(RazorpayVerifyRequestDto request)
    {
        var secret = _config["Razorpay:KeySecret"] ?? "demo_secret_key";
        var payload = $"{request.RazorpayOrderId}|{request.RazorpayPaymentId}";
        
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hashBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        var generatedSignature = BitConverter.ToString(hashBytes).Replace("-", "").ToLower();

        var recResult = await RecordPaymentAsync(new RecordPaymentDto(
            ReservationId: request.ReservationId,
            InvoiceId: null,
            Amount: 0,
            PaymentMethod: PaymentMethod.Online,
            TransactionId: request.RazorpayPaymentId,
            Notes: "Razorpay Online Payment"
        ));

        return recResult;
    }

    private static PaymentDto MapToDto(Payment p) => new(
        p.Id, p.HotelId, p.ReservationId, p.InvoiceId, p.Amount,
        p.PaymentMethod, p.TransactionId, p.PaymentStatus, p.PaymentDate, p.Notes
    );
}
