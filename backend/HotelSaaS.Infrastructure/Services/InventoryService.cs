using HotelSaaS.Application.Common.Interfaces;
using HotelSaaS.Application.Common.Models;
using HotelSaaS.Application.DTOs;
using HotelSaaS.Application.Interfaces;
using HotelSaaS.Domain.Entities;
using HotelSaaS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HotelSaaS.Infrastructure.Services;

public class InventoryService : IInventoryService
{
    private readonly ApplicationDbContext _db;
    private readonly ITenantContext _tenantContext;

    public InventoryService(ApplicationDbContext db, ITenantContext tenantContext)
    {
        _db = db;
        _tenantContext = tenantContext;
    }

    private Guid GetTenantHotelId()
    {
        if (_tenantContext.HotelId.HasValue && _tenantContext.HotelId.Value != Guid.Empty)
        {
            return _tenantContext.HotelId.Value;
        }
        throw new UnauthorizedAccessException("Tenant hotel context is missing or invalid.");
    }

    public async Task<ApiResponse<List<InventoryItemDto>>> GetInventoryItemsAsync()
    {
        var items = await _db.InventoryItems.OrderBy(i => i.Category).ThenBy(i => i.ItemName).ToListAsync();
        return ApiResponse<List<InventoryItemDto>>.Ok(items.Select(MapToDto).ToList());
    }

    public async Task<ApiResponse<InventoryItemDto>> CreateInventoryItemAsync(CreateInventoryItemDto request)
    {
        var hotelId = GetTenantHotelId();

        var item = new InventoryItem
        {
            HotelId = hotelId,
            ItemName = request.ItemName,
            Category = request.Category,
            Quantity = request.Quantity,
            Unit = request.Unit,
            ReorderLevel = request.ReorderLevel,
            UnitCost = request.UnitCost,
            LastRestockedAt = DateTime.UtcNow
        };

        _db.InventoryItems.Add(item);
        await _db.SaveChangesAsync();

        return ApiResponse<InventoryItemDto>.Ok(MapToDto(item), "Inventory item added");
    }

    public async Task<ApiResponse<InventoryItemDto>> RestockItemAsync(Guid itemId, RestockInventoryDto request)
    {
        var item = await _db.InventoryItems.FirstOrDefaultAsync(i => i.Id == itemId);
        if (item == null)
            return ApiResponse<InventoryItemDto>.Fail("Inventory item not found");

        item.Quantity += request.AdditionalQuantity;
        item.LastRestockedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return ApiResponse<InventoryItemDto>.Ok(MapToDto(item), $"Restocked +{request.AdditionalQuantity} {item.Unit} of {item.ItemName}");
    }

    private static InventoryItemDto MapToDto(InventoryItem i) => new(
        i.Id,
        i.HotelId,
        i.ItemName,
        i.Category,
        i.Quantity,
        i.Unit,
        i.ReorderLevel,
        i.UnitCost,
        i.Quantity <= i.ReorderLevel,
        i.LastRestockedAt,
        i.CreatedAt
    );

    private async Task SeedDefaultInventoryAsync(Guid hotelId)
    {
        _db.InventoryItems.AddRange(
            new InventoryItem { HotelId = hotelId, ItemName = "King Size White Bed Sheets", Category = "Linen", Quantity = 45, Unit = "pcs", ReorderLevel = 15, UnitCost = 450, LastRestockedAt = DateTime.UtcNow.AddDays(-2) },
            new InventoryItem { HotelId = hotelId, ItemName = "Luxury Cotton Bath Towels", Category = "Linen", Quantity = 8, Unit = "pcs", ReorderLevel = 20, UnitCost = 280, LastRestockedAt = DateTime.UtcNow.AddDays(-5) },
            new InventoryItem { HotelId = hotelId, ItemName = "Herbal Shampoo 50ml Bottles", Category = "Toiletries", Quantity = 120, Unit = "bottles", ReorderLevel = 50, UnitCost = 18, LastRestockedAt = DateTime.UtcNow.AddDays(-1) },
            new InventoryItem { HotelId = hotelId, ItemName = "Floor Disinfectant Concentrate", Category = "CleaningSupplies", Quantity = 4, Unit = "liters", ReorderLevel = 10, UnitCost = 320, LastRestockedAt = DateTime.UtcNow.AddDays(-10) },
            new InventoryItem { HotelId = hotelId, ItemName = "Full Cream Fresh Milk", Category = "F&B", Quantity = 15, Unit = "liters", ReorderLevel = 8, UnitCost = 65, LastRestockedAt = DateTime.UtcNow }
        );

        await _db.SaveChangesAsync();
    }
}
