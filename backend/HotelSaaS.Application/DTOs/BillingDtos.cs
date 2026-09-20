using HotelSaaS.Domain.Enums;

namespace HotelSaaS.Application.DTOs;

public record InvoiceDto(
    Guid Id,
    Guid HotelId,
    Guid ReservationId,
    string BookingNumber,
    Guid CustomerId,
    string CustomerName,
    string CustomerPhone,
    string CustomerEmail,
    string InvoiceNumber,
    decimal Subtotal,
    decimal Discount,
    decimal Tax,
    decimal Total,
    decimal Paid,
    decimal Due,
    string Status,
    DateTime IssuedAt,
    List<PaymentDto> Payments
);

public record PaymentDto(
    Guid Id,
    Guid HotelId,
    Guid ReservationId,
    Guid? InvoiceId,
    decimal Amount,
    PaymentMethod PaymentMethod,
    string? TransactionId,
    PaymentStatus PaymentStatus,
    DateTime PaymentDate,
    string? Notes
);

public record RecordPaymentDto(
    Guid ReservationId,
    Guid? InvoiceId,
    decimal Amount,
    PaymentMethod PaymentMethod,
    string? TransactionId,
    string? Notes
);

public record RazorpayOrderRequestDto(
    Guid ReservationId,
    decimal Amount
);

public record RazorpayOrderResponseDto(
    string OrderId,
    string KeyId,
    decimal Amount,
    string Currency
);

public record RazorpayVerifyRequestDto(
    string RazorpayOrderId,
    string RazorpayPaymentId,
    string RazorpaySignature,
    Guid ReservationId
);
