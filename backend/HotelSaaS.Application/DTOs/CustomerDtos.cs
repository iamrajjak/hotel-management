namespace HotelSaaS.Application.DTOs;

public record CustomerDto(
    long trainid,
    Guid Id,
    Guid HotelId,
    string FullName,
    string Email,
    string Phone,
    string? Address,
    string? City,
    string? State,
    string? Country,
    string? IdType,
    string? IdNumber,
    string? IdDocumentUrl,
    string? Notes,
    int TotalStays,
    decimal TotalSpent,
    DateTime CreatedAt
);

public record CreateCustomerDto(
    string FullName,
    string Email,
    string Phone,
    string? Address,
    string? City,
    string? State,
    string? Country,
    string? IdType,
    string? IdNumber,
    string? IdDocumentUrl,
    string? Notes
);
