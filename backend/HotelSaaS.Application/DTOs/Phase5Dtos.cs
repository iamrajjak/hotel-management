namespace HotelSaaS.Application.DTOs;

public record HousekeepingTaskDto(
    Guid Id,
    Guid HotelId,
    Guid RoomId,
    string RoomNumber,
    string RoomTypeName,
    string? AssignedTo,
    string TaskType,
    string Priority,
    string Status,
    string? Notes,
    DateTime CreatedAt,
    DateTime? CompletedAt
);

public record CreateHousekeepingTaskDto(
    Guid RoomId,
    string? AssignedTo,
    string TaskType,
    string Priority,
    string? Notes
);

public record InventoryItemDto(
    Guid Id,
    Guid HotelId,
    string ItemName,
    string Category,
    decimal Quantity,
    string Unit,
    decimal ReorderLevel,
    decimal UnitCost,
    bool IsLowStock,
    DateTime? LastRestockedAt,
    DateTime CreatedAt
);

public record CreateInventoryItemDto(
    string ItemName,
    string Category,
    decimal Quantity,
    string Unit,
    decimal ReorderLevel,
    decimal UnitCost
);

public record RestockInventoryDto(
    decimal AdditionalQuantity
);
