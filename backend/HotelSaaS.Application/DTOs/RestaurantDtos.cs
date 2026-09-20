using HotelSaaS.Domain.Enums;

namespace HotelSaaS.Application.DTOs;

public record RestaurantCategoryDto(
    Guid Id,
    Guid HotelId,
    string Name,
    string? Description,
    int SortOrder
);

public record CreateRestaurantCategoryDto(
    string Name,
    string? Description,
    int SortOrder = 0
);

public record MenuItemDto(
    Guid Id,
    Guid HotelId,
    Guid CategoryId,
    string CategoryName,
    string Name,
    string? Description,
    decimal Price,
    string? ImageUrl,
    bool IsVeg,
    bool IsAvailable,
    int PreparationTime
);

public record CreateMenuItemDto(
    Guid CategoryId,
    string Name,
    string? Description,
    decimal Price,
    string? ImageUrl,
    bool IsVeg = true,
    bool IsAvailable = true,
    int PreparationTime = 15
);

public record RestaurantTableDto(
    Guid Id,
    Guid HotelId,
    string TableNumber,
    int Capacity,
    string Status
);

public record CreateRestaurantTableDto(
    string TableNumber,
    int Capacity = 4,
    string Status = "Available"
);

public record UpdateRestaurantTableStatusDto(
    string Status
);

public record CreateRestaurantOrderItemDto(
    Guid MenuItemId,
    int Quantity,
    string? Notes
);

public record CreateRestaurantOrderDto(
    Guid? TableId,
    Guid? RoomId,
    Guid? ReservationId,
    OrderType OrderType,
    List<CreateRestaurantOrderItemDto> Items,
    string? Notes,
    string? PaymentMethod = "Cash"
);

public record RestaurantOrderItemDto(
    Guid Id,
    Guid MenuItemId,
    string MenuItemName,
    int Quantity,
    decimal UnitPrice,
    decimal TotalPrice,
    string? Notes
);

public record RestaurantOrderDto(
    Guid Id,
    Guid HotelId,
    string OrderNumber,
    Guid? TableId,
    string? TableNumber,
    Guid? RoomId,
    string? RoomNumber,
    Guid? ReservationId,
    OrderType OrderType,
    OrderStatus Status,
    decimal Subtotal,
    decimal TaxAmount,
    decimal DiscountAmount,
    decimal TotalAmount,
    string? PaymentMethod,
    string? PaymentStatus,
    string? Notes,
    DateTime CreatedAt,
    List<RestaurantOrderItemDto> Items
);

public record UpdateOrderStatusDto(
    OrderStatus Status
);

public record KotTicketDto(
    Guid Id,
    Guid HotelId,
    string KotNumber,
    Guid OrderId,
    string? TableNumber,
    OrderType OrderType,
    string ItemsJson,
    KotStatus Status,
    string? Notes,
    DateTime CreatedAt
);

public record UpdateKotStatusDto(
    KotStatus Status
);
