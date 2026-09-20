using HotelSaaS.Domain.Enums;

namespace HotelSaaS.Application.DTOs;

public record ReservationDto(
    Guid Id,
    Guid HotelId,
    string BookingNumber,
    Guid CustomerId,
    string CustomerName,
    string CustomerPhone,
    string CustomerEmail,
    Guid RoomId,
    string RoomNumber,
    string RoomTypeName,
    DateTime CheckInDate,
    DateTime CheckOutDate,
    int Adults,
    int Children,
    decimal BaseAmount,
    decimal DiscountAmount,
    decimal TaxAmount,
    decimal TotalAmount,
    decimal PaidAmount,
    decimal DueAmount,
    PaymentStatus PaymentStatus,
    BookingStatus BookingStatus,
    string BookingSource,
    string? SpecialRequest,
    DateTime CreatedAt
);

public class CreateReservationDto
{
    public Guid? CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public string CustomerPhone { get; set; } = string.Empty;
    public Guid RoomId { get; set; } = Guid.Empty;
    public string? RoomNumber { get; set; }
    public DateTime CheckInDate { get; set; } = DateTime.UtcNow;
    public DateTime CheckOutDate { get; set; } = DateTime.UtcNow.AddDays(1);
    public int Adults { get; set; } = 1;
    public int Children { get; set; } = 0;
    public decimal BaseAmount { get; set; } = 0;
    public decimal DiscountAmount { get; set; } = 0;
    public decimal TaxAmount { get; set; } = 0;
    public decimal PaidAmount { get; set; } = 0;
    public string PaymentMethod { get; set; } = "Cash";
    public string BookingSource { get; set; } = "Direct";
    public string? BookingStatus { get; set; }
    public string? SpecialRequest { get; set; }
}

public record RoomAvailabilityQueryDto(
    DateTime CheckInDate,
    DateTime CheckOutDate,
    int Adults,
    int Children
);
