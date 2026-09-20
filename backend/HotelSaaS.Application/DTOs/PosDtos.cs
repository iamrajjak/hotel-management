namespace HotelSaaS.Application.DTOs;

public record PosCategoryDto(
    Guid Id,
    string Name,
    string Slug,
    int DisplayOrder,
    List<PosMenuItemDto> MenuItems
);

public record PosMenuItemDto(
    Guid Id,
    Guid CategoryId,
    string CategoryName,
    string Name,
    string? Description,
    decimal Price,
    string? ImageUrl,
    bool IsAvailable
);

public record PosOrderDto(
    Guid Id,
    string OrderNumber,
    Guid? ReservationId,
    string? RoomNumber,
    string? GuestName,
    string? TableNumber,
    string OrderType,
    decimal Subtotal,
    decimal Tax,
    decimal Total,
    string OrderStatus,
    string PaymentStatus,
    DateTime CreatedAt,
    List<PosOrderItemDto> OrderItems
);

public record PosOrderItemDto(
    Guid Id,
    Guid MenuItemId,
    string ItemName,
    decimal UnitPrice,
    int Quantity,
    decimal Subtotal,
    string? Notes
);

public record CreatePosOrderDto(
    Guid? ReservationId,
    Guid? RoomId,
    string? TableNumber,
    string OrderType, // RoomService, DineIn, Takeaway
    bool ChargeToRoom,
    List<CreatePosOrderItemDto> Items
);

public record CreatePosOrderItemDto(
    Guid MenuItemId,
    int Quantity,
    string? Notes
);

public record CreatePosMenuItemDto(
    string CategoryName,
    string Name,
    string? Description,
    decimal Price
);

public record UpdatePosMenuItemDto(
    string? CategoryName,
    string Name,
    string? Description,
    decimal Price,
    bool IsAvailable
);

