using HotelSaaS.Domain.Enums;

namespace HotelSaaS.Application.DTOs;

public record CalendarRoomRowDto(
    Guid RoomId,
    string RoomNumber,
    string RoomTypeName,
    string Floor,
    RoomStatus RoomStatus,
    decimal Price,
    List<CalendarBookingEventDto> Bookings
);

public record CalendarBookingEventDto(
    Guid ReservationId,
    string BookingNumber,
    string CustomerName,
    string CustomerPhone,
    DateTime CheckInDate,
    DateTime CheckOutDate,
    BookingStatus BookingStatus,
    PaymentStatus PaymentStatus,
    decimal TotalAmount
);

public record CalendarMatrixResponseDto(
    DateTime StartDate,
    DateTime EndDate,
    List<CalendarRoomRowDto> RoomRows
);
