namespace HotelSaaS.Application.DTOs;

public record ExpenseDto(
    Guid Id,
    Guid HotelId,
    string Category,
    decimal Amount,
    string Description,
    DateTime ExpenseDate,
    string PaymentMethod,
    string? ReferenceNumber,
    string? CreatedBy,
    string? ReceiptUrl,
    DateTime CreatedAt
);

public record CreateExpenseDto(
    string Category,
    decimal Amount,
    string Description,
    DateTime? ExpenseDate,
    string PaymentMethod = "Cash",
    string? ReferenceNumber = null,
    string? ReceiptUrl = null
);

public record UpdateExpenseDto(
    string Category,
    decimal Amount,
    string Description,
    DateTime ExpenseDate,
    string PaymentMethod,
    string? ReferenceNumber,
    string? ReceiptUrl
);
