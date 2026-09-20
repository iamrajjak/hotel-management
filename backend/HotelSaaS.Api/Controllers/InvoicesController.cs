using System;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using HotelSaaS.Application.Common.Interfaces;
using HotelSaaS.Application.Common.Models;
using HotelSaaS.Domain.Entities;
using HotelSaaS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HotelSaaS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InvoicesController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ITenantContext _tenantContext;

    public InvoicesController(ApplicationDbContext db, ITenantContext tenantContext)
    {
        _db = db;
        _tenantContext = tenantContext;
    }

    [HttpGet("reservation/{reservationId}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetInvoiceByReservationId(string reservationId)
    {
        var target = (reservationId ?? "").Trim();
        Guid.TryParse(target, out var parsedGuid);

        var reservation = await _db.Reservations
            .IgnoreQueryFilters()
            .Include(r => r.Customer)
            .Include(r => r.Room)
            .ThenInclude(room => room.RoomType)
            .FirstOrDefaultAsync(r => r.Id == parsedGuid || r.BookingNumber == target || r.Id.ToString() == target);

        if (reservation == null)
        {
            return NotFound(ApiResponse<object>.Fail("Reservation not found."));
        }

        var hotelId = reservation.HotelId;
        var hotel = await _db.Hotels.IgnoreQueryFilters().FirstOrDefaultAsync(h => h.Id == hotelId)
                    ?? await _db.Hotels.IgnoreQueryFilters().FirstOrDefaultAsync();

        var payments = await _db.Payments
            .IgnoreQueryFilters()
            .Where(p => p.ReservationId == reservation.Id)
            .OrderBy(p => p.PaymentDate)
            .ToListAsync();

        var invoiceData = new
        {
            InvoiceNumber = $"INV-{reservation.BookingNumber.Replace("BK-", "")}",
            IssuedDate = DateTime.Now.ToString("dd MMM yyyy"),
            Hotel = new
            {
                Name = hotel?.Name ?? "Grand Palace Resort",
                Address = hotel?.Address ?? "123 MG Road",
                City = hotel?.City ?? "Jaipur",
                State = hotel?.State ?? "Rajasthan",
                Pincode = hotel?.Pincode ?? "302001",
                Phone = hotel?.Phone ?? "+91 98765 43210",
                Email = hotel?.Email ?? "info@hotel.com",
                GstNumber = hotel?.GstNumber ?? "30AAAAA0000A1Z5",
                BankName = hotel?.BankName ?? "ICICI Bank",
                AccountNo = hotel?.AccountNo ?? "987654321098",
                IfscCode = hotel?.IfscCode ?? "ICIC0000999",
                UpiId = hotel?.UpiId ?? "hotel@upi",
                LogoUrl = hotel?.LogoUrl
            },
            Guest = new
            {
                Name = reservation.Customer?.FullName ?? "Guest",
                Phone = reservation.Customer?.Phone ?? "",
                Email = reservation.Customer?.Email ?? "",
                Address = $"{reservation.Customer?.City ?? ""}, {reservation.Customer?.State ?? ""}"
            },
            Booking = new
            {
                BookingNumber = reservation.BookingNumber,
                RoomNumber = reservation.Room?.RoomNumber ?? "101",
                RoomType = reservation.Room?.RoomType?.Name ?? "Deluxe Room",
                CheckInDate = reservation.CheckInDate.ToString("dd MMM yyyy, hh:mm tt"),
                CheckOutDate = reservation.CheckOutDate.ToString("dd MMM yyyy, hh:mm tt"),
                Nights = Math.Max(1, (reservation.CheckOutDate.Date - reservation.CheckInDate.Date).Days),
                Adults = reservation.Adults,
                Children = reservation.Children
            },
            Financials = new
            {
                BaseAmount = reservation.BaseAmount,
                DiscountAmount = reservation.DiscountAmount,
                TaxAmount = reservation.TaxAmount,
                TotalAmount = reservation.TotalAmount,
                PaidAmount = reservation.PaidAmount,
                DueAmount = reservation.DueAmount,
                PaymentStatus = reservation.PaymentStatus.ToString()
            },
            Payments = payments.Select(p => new
            {
                Date = p.PaymentDate,
                Amount = p.Amount,
                Method = p.PaymentMethod.ToString(),
                TransactionId = p.TransactionId ?? "N/A"
            })
        };

        return Ok(ApiResponse<object>.Ok(invoiceData));
    }

    [HttpGet("reservation/{reservationId}/print")]
    [AllowAnonymous]
    public async Task<IActionResult> PrintInvoiceHtml(string reservationId)
    {
        var target = (reservationId ?? "").Trim();
        Guid.TryParse(target, out var parsedGuid);

        var reservation = await _db.Reservations
            .IgnoreQueryFilters()
            .Include(r => r.Customer)
            .Include(r => r.Room)
            .ThenInclude(room => room.RoomType)
            .FirstOrDefaultAsync(r => r.Id == parsedGuid || r.BookingNumber == target || r.Id.ToString() == target);

        if (reservation == null)
        {
            return Content("<html><body><h3>Invoice Not Found</h3></body></html>", "text/html");
        }

        var hotel = await _db.Hotels.IgnoreQueryFilters().FirstOrDefaultAsync(h => h.Id == reservation.HotelId)
                    ?? await _db.Hotels.IgnoreQueryFilters().FirstOrDefaultAsync();

        var nights = Math.Max(1, (reservation.CheckOutDate.Date - reservation.CheckInDate.Date).Days);
        var invNum = $"INV-{reservation.BookingNumber.Replace("BK-", "")}";

        var html = $@"<!DOCTYPE html>
<html lang=""en"">
<head>
    <meta charset=""UTF-8"">
    <title>GST Tax Invoice - {invNum}</title>
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: #f8fafc; margin: 0; padding: 20px; }}
        .invoice-card {{ max-width: 800px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); padding: 40px; border: 1px solid #e2e8f0; }}
        .header-table {{ width: 100%; border-collapse: collapse; margin-bottom: 30px; }}
        .hotel-title {{ font-size: 24px; font-weight: 700; color: #0f172a; margin: 0 0 4px 0; }}
        .subtitle {{ font-size: 13px; color: #64748b; margin: 0; }}
        .badge-tax {{ background: #0f172a; color: #ffffff; font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 6px; display: inline-block; letter-spacing: 1px; }}
        .info-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 24px; font-size: 13px; border: 1px solid #e2e8f0; }}
        .item-table {{ width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px; }}
        .item-table th {{ background: #0f172a; color: #ffffff; text-align: left; padding: 10px 14px; font-weight: 600; }}
        .item-table td {{ padding: 12px 14px; border-bottom: 1px solid #e2e8f0; }}
        .totals-table {{ width: 320px; margin-left: auto; border-collapse: collapse; font-size: 14px; }}
        .totals-table td {{ padding: 6px 10px; text-align: right; }}
        .totals-table .grand-total {{ font-size: 16px; font-weight: 700; color: #0f172a; border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; padding: 10px; }}
        .bank-card {{ background: #f1f5f9; padding: 14px; border-radius: 8px; font-size: 12px; color: #334155; margin-top: 24px; width: 60%; float: left; }}
        .signature-box {{ float: right; text-align: center; font-size: 12px; color: #64748b; margin-top: 40px; }}
        .btn-print {{ background: #2563eb; color: white; border: none; padding: 10px 20px; font-size: 14px; font-weight: 600; border-radius: 6px; cursor: pointer; margin-bottom: 20px; float: right; }}
        @media print {{
            body {{ background: white; padding: 0; }}
            .invoice-card {{ box-shadow: none; border: none; padding: 0; max-width: 100%; }}
            .btn-print {{ display: none; }}
        }}
    </style>
</head>
<body>
    <div style=""max-width: 800px; margin: 0 auto;"">
        <button onclick=""window.print()"" class=""btn-print"">🖨️ Print / Download PDF</button>
        <div style=""clear: both;""></div>

        <div class=""invoice-card"">
            <table class=""header-table"">
                <tr>
                    <td>
                        <h1 class=""hotel-title"">{hotel?.Name ?? "Grand Palace Resort"}</h1>
                        <p class=""subtitle"">{hotel?.Address}, {hotel?.City}, {hotel?.State} - {hotel?.Pincode}</p>
                        <p class=""subtitle"">Phone: {hotel?.Phone} | Email: {hotel?.Email}</p>
                        <p class=""subtitle""><b>GSTIN:</b> {hotel?.GstNumber ?? "N/A"}</p>
                    </td>
                    <td style=""text-align: right; vertical-align: top;"">
                        <span class=""badge-tax"">TAX INVOICE</span>
                        <p style=""font-size: 14px; font-weight: 600; margin: 10px 0 0 0;"">{invNum}</p>
                        <p style=""font-size: 12px; color: #64748b; margin: 4px 0 0 0;"">Date: {DateTime.Now:dd MMM yyyy}</p>
                    </td>
                </tr>
            </table>

            <div class=""info-grid"">
                <div>
                    <h4 style=""margin: 0 0 8px 0; color: #0f172a;"">Billed To (Guest Details)</h4>
                    <p style=""margin: 2px 0;""><b>Name:</b> {reservation.Customer?.FullName}</p>
                    <p style=""margin: 2px 0;""><b>Phone:</b> {reservation.Customer?.Phone}</p>
                    <p style=""margin: 2px 0;""><b>Email:</b> {reservation.Customer?.Email ?? "N/A"}</p>
                </div>
                <div>
                    <h4 style=""margin: 0 0 8px 0; color: #0f172a;"">Booking Details</h4>
                    <p style=""margin: 2px 0;""><b>Booking ID:</b> {reservation.BookingNumber}</p>
                    <p style=""margin: 2px 0;""><b>Room:</b> {reservation.Room?.RoomNumber} ({reservation.Room?.RoomType?.Name})</p>
                    <p style=""margin: 2px 0;""><b>Check-in:</b> {reservation.CheckInDate:dd MMM yyyy, hh:mm tt}</p>
                    <p style=""margin: 2px 0;""><b>Check-out:</b> {reservation.CheckOutDate:dd MMM yyyy, hh:mm tt}</p>
                </div>
            </div>

            <table class=""item-table"">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Nights</th>
                        <th>Rate / Night</th>
                        <th style=""text-align: right;"">Total (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Room Stay ({reservation.Room?.RoomType?.Name} - Room {reservation.Room?.RoomNumber})</td>
                        <td>{nights}</td>
                        <td>₹{(reservation.BaseAmount / nights):N2}</td>
                        <td style=""text-align: right;"">₹{reservation.BaseAmount:N2}</td>
                    </tr>
                </tbody>
            </table>

            <div style=""width: 100%; display: inline-block;"">
                <div class=""bank-card"">
                    <h5 style=""margin: 0 0 6px 0; color: #0f172a;"">Bank & Payment Details</h5>
                    <p style=""margin: 2px 0;""><b>Bank Name:</b> {hotel?.BankName ?? "ICICI Bank"}</p>
                    <p style=""margin: 2px 0;""><b>Account No:</b> {hotel?.AccountNo ?? "N/A"}</p>
                    <p style=""margin: 2px 0;""><b>IFSC Code:</b> {hotel?.IfscCode ?? "N/A"}</p>
                    <p style=""margin: 2px 0;""><b>UPI VPA ID:</b> {hotel?.UpiId ?? "N/A"}</p>
                </div>

                <table class=""totals-table"">
                    <tr>
                        <td>Subtotal:</td>
                        <td>₹{reservation.BaseAmount:N2}</td>
                    </tr>
                    <tr>
                        <td>Discount:</td>
                        <td>- ₹{reservation.DiscountAmount:N2}</td>
                    </tr>
                    <tr>
                        <td>GST ({hotel?.TaxRate ?? "12%"}):</td>
                        <td>+ ₹{reservation.TaxAmount:N2}</td>
                    </tr>
                    <tr class=""grand-total"">
                        <td>Total Amount:</td>
                        <td>₹{reservation.TotalAmount:N2}</td>
                    </tr>
                    <tr>
                        <td><b>Paid Amount:</b></td>
                        <td style=""color: #16a34a; font-weight: 600;"">₹{reservation.PaidAmount:N2}</td>
                    </tr>
                    <tr>
                        <td><b>Balance Due:</b></td>
                        <td style=""color: #dc2626; font-weight: 600;"">₹{reservation.DueAmount:N2}</td>
                    </tr>
                </table>
            </div>

            <div style=""margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px;"">
                <div class=""signature-box"">
                    <p style=""margin: 0 0 40px 0;"">For {hotel?.Name}</p>
                    <p style=""margin: 0; font-weight: 600; border-top: 1px dashed #cbd5e1; padding-top: 4px;"">Authorized Signatory</p>
                </div>
                <div style=""clear: both;""></div>
            </div>
        </div>
    </div>
</body>
</html>";

        return Content(html, "text/html");
    }
}
