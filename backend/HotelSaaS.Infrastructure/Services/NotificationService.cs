using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using HotelSaaS.Application.Interfaces;
using HotelSaaS.Domain.Entities;
using HotelSaaS.Infrastructure.Persistence;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace HotelSaaS.Infrastructure.Services;

public class NotificationService : INotificationService
{
    private readonly ApplicationDbContext _db;
    private readonly ITursoSyncService _tursoSync;
    private readonly IConfiguration _config;
    private readonly ILogger<NotificationService> _logger;
    private static readonly HttpClient _httpClient = new HttpClient();

    public NotificationService(
        ApplicationDbContext db,
        ITursoSyncService tursoSync,
        IConfiguration config,
        ILogger<NotificationService> logger)
    {
        _db = db;
        _tursoSync = tursoSync;
        _config = config;
        _logger = logger;
    }

    public async Task SendBookingConfirmationNotificationAsync(Reservation reservation, Hotel hotel, Customer customer)
    {
        try
        {
            var roomNum = reservation.Room?.RoomNumber ?? "Assigned upon arrival";
            var checkInStr = reservation.CheckInDate.ToString("dd MMM yyyy");
            var checkOutStr = reservation.CheckOutDate.ToString("dd MMM yyyy");
            var totalStr = reservation.TotalAmount.ToString("N2");

            var messageText = $"Namaste {customer.FullName}! 🙏\n" +
                              $"Your booking at *{hotel.Name}* has been CONFIRMED!\n\n" +
                              $"📋 *Booking ID:* {reservation.BookingNumber}\n" +
                              $"🚪 *Room:* {roomNum}\n" +
                              $"📅 *Check-in:* {checkInStr}\n" +
                              $"📅 *Check-out:* {checkOutStr}\n" +
                              $"💰 *Total Amount:* ₹{totalStr}\n\n" +
                              $"For any queries, call us at {hotel.Phone}.\nWe look forward to hosting you! ✨";

            await DispatchNotificationAsync(
                hotel: hotel,
                customer: customer,
                reservationId: reservation.Id,
                subject: $"Booking Confirmation - {reservation.BookingNumber}",
                messageText: messageText,
                channel: "WhatsApp/SMS"
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending booking confirmation notification for reservation {BookingNumber}", reservation.BookingNumber);
        }
    }

    public async Task SendCheckInNotificationAsync(Reservation reservation, Hotel hotel, Customer customer)
    {
        try
        {
            var roomNum = reservation.Room?.RoomNumber ?? "Your Room";
            var messageText = $"Welcome to *{hotel.Name}*, {customer.FullName}! 🏨✨\n\n" +
                              $"You have successfully checked into Room *{roomNum}*.\n" +
                              $"📶 *Wi-Fi Network:* {hotel.Name}_Guest\n" +
                              $"📞 *Front Desk:* Dial 0 from your room phone or call {hotel.Phone}.\n\n" +
                              $"Wish you a very comfortable stay with us! 😊";

            await DispatchNotificationAsync(
                hotel: hotel,
                customer: customer,
                reservationId: reservation.Id,
                subject: $"Welcome & Check-in - Room {roomNum}",
                messageText: messageText,
                channel: "WhatsApp/SMS"
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending check-in notification for reservation {BookingNumber}", reservation.BookingNumber);
        }
    }

    public async Task SendCheckOutNotificationAsync(Reservation reservation, Hotel hotel, Customer customer)
    {
        try
        {
            var invoiceId = string.IsNullOrEmpty(reservation.BookingNumber) ? reservation.Id.ToString() : reservation.BookingNumber;
            var printUrl = $"http://localhost:3000/admin/invoices/print?id={invoiceId}";
            var messageText = $"Thank you for staying at *{hotel.Name}*, {customer.FullName}! 👋\n\n" +
                              $"Your check-out for Booking *{reservation.BookingNumber}* is completed.\n" +
                              $"📄 Total Paid: ₹{reservation.PaidAmount:N2}\n\n" +
                              $"🧾 *Click Link Below to View & Print Official Bill:* \n{printUrl}\n\n" +
                              $"We hope you enjoyed your stay. We would love to welcome you back soon! Have a safe journey ahead! 🌟";

            await DispatchNotificationAsync(
                hotel: hotel,
                customer: customer,
                reservationId: reservation.Id,
                subject: $"Check-out Thank You - {reservation.BookingNumber}",
                messageText: messageText,
                channel: "WhatsApp/SMS"
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending check-out notification for reservation {BookingNumber}", reservation.BookingNumber);
        }
    }

    private async Task DispatchNotificationAsync(
        Hotel hotel,
        Customer customer,
        Guid reservationId,
        string subject,
        string messageText,
        string channel)
    {
        var phone = customer.Phone;
        var email = customer.Email ?? "guest@example.com";
        var status = "Sent (Simulated)";

        // Check if WhatsApp API Key is configured in appsettings or environment
        var whatsappApiKey = _config["WhatsApp:ApiKey"] ?? _config["ULTRAMSG_API_KEY"];
        var whatsappInstanceId = _config["WhatsApp:InstanceId"] ?? _config["ULTRAMSG_INSTANCE_ID"];

        if (!string.IsNullOrEmpty(whatsappApiKey) && !string.IsNullOrEmpty(whatsappInstanceId))
        {
            try
            {
                var cleanPhone = phone.Replace("+", "").Replace(" ", "").Replace("-", "");
                if (cleanPhone.Length == 10) cleanPhone = "91" + cleanPhone;

                var apiUrl = $"https://api.ultramsg.com/{whatsappInstanceId}/messages/chat";
                var payload = new
                {
                    token = whatsappApiKey,
                    to = cleanPhone,
                    body = messageText
                };

                var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync(apiUrl, content);
                if (response.IsSuccessStatusCode)
                {
                    status = "Delivered";
                }
                else
                {
                    status = "Failed";
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send live WhatsApp message, falling back to simulated status");
                status = "Failed (Gateway Error)";
            }
        }

        var comm = new Communication
        {
            HotelId = hotel.Id,
            HotelCode = hotel.HotelCode,
            SenderName = hotel.Name,
            SenderEmail = hotel.Email,
            SenderPhone = hotel.Phone,
            Subject = subject,
            Message = messageText,
            Channel = channel,
            Status = status,
            CustomerId = customer.Id,
            ReservationId = reservationId,
            SentAt = DateTime.UtcNow
        };

        try
        {
            _db.Communications.Add(comm);
            await _db.SaveChangesAsync();
        }
        catch (ObjectDisposedException)
        {
            _logger.LogInformation("DbContext disposed before communication log save; skipping local DB insert");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to save local communication record");
        }

        // Sync with Turso Cloud asynchronously
        var sql = $"INSERT INTO Communications (Id, HotelId, HotelCode, SenderName, SenderEmail, SenderPhone, Subject, Message, Channel, Status, CustomerId, ReservationId, SentAt) " +
                  $"VALUES ('{comm.Id}', '{comm.HotelId}', '{comm.HotelCode}', '{comm.SenderName.Replace("'", "''")}', '{comm.SenderEmail?.Replace("'", "''") ?? ""}', '{comm.SenderPhone}', '{comm.Subject.Replace("'", "''")}', '{comm.Message.Replace("'", "''")}', '{comm.Channel}', '{comm.Status}', '{comm.CustomerId}', '{comm.ReservationId}', '{comm.SentAt:yyyy-MM-dd HH:mm:ss}');";
        await _tursoSync.ExecuteSqlAsync(sql);

        _logger.LogInformation("Notification [{Subject}] logged for customer {Phone} with status '{Status}'", subject, phone, status);
    }
}
