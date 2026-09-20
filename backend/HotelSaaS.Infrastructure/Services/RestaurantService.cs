using HotelSaaS.Application.Common.Interfaces;
using HotelSaaS.Application.Common.Models;
using HotelSaaS.Application.DTOs;
using HotelSaaS.Application.Interfaces;
using HotelSaaS.Domain.Entities;
using HotelSaaS.Domain.Enums;
using HotelSaaS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HotelSaaS.Infrastructure.Services;

public class RestaurantService : IRestaurantService
{
    private readonly ApplicationDbContext _db;
    private readonly ITenantContext _tenantContext;

    public RestaurantService(ApplicationDbContext db, ITenantContext tenantContext)
    {
        _db = db;
        _tenantContext = tenantContext;
    }

    private Guid GetTenantHotelId()
    {
        if (!_tenantContext.HotelId.HasValue || _tenantContext.HotelId.Value == Guid.Empty)
        {
            throw new UnauthorizedAccessException("Tenant context is required for restaurant operations.");
        }
        return _tenantContext.HotelId.Value;
    }

    // --- CATEGORIES ---
    public async Task<ApiResponse<List<RestaurantCategoryDto>>> GetCategoriesAsync()
    {
        var hotelId = GetTenantHotelId();

        var localHotel = await _db.Hotels.FirstOrDefaultAsync(h => h.Id == hotelId);
        if (localHotel == null)
        {
            _db.Hotels.Add(new Hotel
            {
                Id = hotelId,
                Name = "Grand Palace Hotel",
                Slug = "grand-palace",
                Phone = "",
                Email = "",
                Status = "Active"
            });
            try { await _db.SaveChangesAsync(); } catch { }
        }

        var categories = await _db.RestaurantCategories
            .OrderBy(c => c.SortOrder)
            .ThenBy(c => c.Name)
            .ToListAsync();

        if (categories.Count == 0)
        {
            var defaultCategories = new List<RestaurantCategory>
            {
                new RestaurantCategory { HotelId = hotelId, Name = "Breakfast & Snacks", Description = "Morning breakfast and tea-time snacks", SortOrder = 1 },
                new RestaurantCategory { HotelId = hotelId, Name = "Main Course", Description = "North & South Indian main dishes", SortOrder = 2 },
                new RestaurantCategory { HotelId = hotelId, Name = "Beverages & Drinks", Description = "Cold & hot drinks, sodas & teas", SortOrder = 3 },
                new RestaurantCategory { HotelId = hotelId, Name = "Desserts", Description = "Sweets and ice creams", SortOrder = 4 }
            };

            _db.RestaurantCategories.AddRange(defaultCategories);
            try
            {
                await _db.SaveChangesAsync();
                categories = await _db.RestaurantCategories.OrderBy(c => c.SortOrder).ThenBy(c => c.Name).ToListAsync();

                // Also seed menu items for these categories
                var breakfastCat = categories.FirstOrDefault(c => c.Name.Contains("Breakfast"));
                var mainCat = categories.FirstOrDefault(c => c.Name.Contains("Main"));
                var bevCat = categories.FirstOrDefault(c => c.Name.Contains("Beverages"));
                var desCat = categories.FirstOrDefault(c => c.Name.Contains("Desserts"));

                var menuItems = new List<MenuItem>();
                if (mainCat != null)
                {
                    menuItems.Add(new MenuItem { HotelId = hotelId, CategoryId = mainCat.Id, Name = "Paneer Butter Masala", Description = "Cottage cheese in rich tomato gravy", Price = 280, IsVeg = true, IsAvailable = true, PreparationTime = 20 });
                    menuItems.Add(new MenuItem { HotelId = hotelId, CategoryId = mainCat.Id, Name = "Dal Makhani & Butter Naan", Description = "Creamy black lentils served with naan", Price = 240, IsVeg = true, IsAvailable = true, PreparationTime = 15 });
                }
                if (breakfastCat != null)
                {
                    menuItems.Add(new MenuItem { HotelId = hotelId, CategoryId = breakfastCat.Id, Name = "Crispy Veg Spring Roll", Description = "Golden fried vegetable rolls", Price = 180, IsVeg = true, IsAvailable = true, PreparationTime = 12 });
                    menuItems.Add(new MenuItem { HotelId = hotelId, CategoryId = breakfastCat.Id, Name = "Club Sandwich & Fries", Description = "Triple-decker sandwich served with fries", Price = 160, IsVeg = true, IsAvailable = true, PreparationTime = 10 });
                }
                if (bevCat != null)
                {
                    menuItems.Add(new MenuItem { HotelId = hotelId, CategoryId = bevCat.Id, Name = "Fresh Lemon Soda", Description = "Refreshing mint & lemon soda", Price = 90, IsVeg = true, IsAvailable = true, PreparationTime = 5 });
                    menuItems.Add(new MenuItem { HotelId = hotelId, CategoryId = bevCat.Id, Name = "Masala Chai", Description = "Traditional Indian spiced tea", Price = 60, IsVeg = true, IsAvailable = true, PreparationTime = 5 });
                }
                if (desCat != null)
                {
                    menuItems.Add(new MenuItem { HotelId = hotelId, CategoryId = desCat.Id, Name = "Gulab Jamun with Ice Cream", Description = "Hot gulab jamun with vanilla ice cream", Price = 120, IsVeg = true, IsAvailable = true, PreparationTime = 5 });
                }

                if (menuItems.Count > 0)
                {
                    _db.MenuItems.AddRange(menuItems);
                    await _db.SaveChangesAsync();
                }
            }
            catch { }
        }

        var dtos = categories.Select(c => new RestaurantCategoryDto(
            c.Id, c.HotelId, c.Name, c.Description, c.SortOrder
        )).ToList();

        return ApiResponse<List<RestaurantCategoryDto>>.Ok(dtos);
    }

    public async Task<ApiResponse<RestaurantCategoryDto>> CreateCategoryAsync(CreateRestaurantCategoryDto request)
    {
        var hotelId = GetTenantHotelId();

        var category = new RestaurantCategory
        {
            HotelId = hotelId,
            Name = request.Name.Trim(),
            Description = request.Description,
            SortOrder = request.SortOrder
        };

        _db.RestaurantCategories.Add(category);
        await _db.SaveChangesAsync();

        return ApiResponse<RestaurantCategoryDto>.Ok(new RestaurantCategoryDto(
            category.Id, category.HotelId, category.Name, category.Description, category.SortOrder
        ), "Restaurant category created successfully");
    }

    public async Task<ApiResponse<RestaurantCategoryDto>> UpdateCategoryAsync(Guid id, CreateRestaurantCategoryDto request)
    {
        var category = await _db.RestaurantCategories.FirstOrDefaultAsync(c => c.Id == id);
        if (category == null) return ApiResponse<RestaurantCategoryDto>.Fail("Category not found");

        category.Name = request.Name.Trim();
        category.Description = request.Description;
        category.SortOrder = request.SortOrder;

        await _db.SaveChangesAsync();

        return ApiResponse<RestaurantCategoryDto>.Ok(new RestaurantCategoryDto(
            category.Id, category.HotelId, category.Name, category.Description, category.SortOrder
        ), "Category updated successfully");
    }

    public async Task<ApiResponse<bool>> DeleteCategoryAsync(Guid id)
    {
        var category = await _db.RestaurantCategories.FirstOrDefaultAsync(c => c.Id == id);
        if (category == null) return ApiResponse<bool>.Fail("Category not found");

        _db.RestaurantCategories.Remove(category);
        await _db.SaveChangesAsync();

        return ApiResponse<bool>.Ok(true, "Category deleted successfully");
    }

    // --- MENU ITEMS ---
    public async Task<ApiResponse<List<MenuItemDto>>> GetMenuItemsAsync(Guid? categoryId = null)
    {
        var query = _db.MenuItems.Include(m => m.Category).AsQueryable();

        if (categoryId.HasValue && categoryId.Value != Guid.Empty)
        {
            query = query.Where(m => m.CategoryId == categoryId.Value);
        }

        var items = await query.OrderBy(m => m.Name).ToListAsync();

        var dtos = items.Select(m => new MenuItemDto(
            m.Id, m.HotelId, m.CategoryId, m.Category?.Name ?? "", m.Name, m.Description, m.Price, m.ImageUrl, m.IsVeg, m.IsAvailable, m.PreparationTime
        )).ToList();

        return ApiResponse<List<MenuItemDto>>.Ok(dtos);
    }

    public async Task<ApiResponse<MenuItemDto>> CreateMenuItemAsync(CreateMenuItemDto request)
    {
        var hotelId = GetTenantHotelId();

        var category = await _db.RestaurantCategories.FirstOrDefaultAsync(c => c.Id == request.CategoryId);
        if (category == null) return ApiResponse<MenuItemDto>.Fail("Selected restaurant category does not exist");

        var item = new MenuItem
        {
            HotelId = hotelId,
            CategoryId = request.CategoryId,
            Name = request.Name.Trim(),
            Description = request.Description,
            Price = request.Price,
            ImageUrl = request.ImageUrl,
            IsVeg = request.IsVeg,
            IsAvailable = request.IsAvailable,
            PreparationTime = request.PreparationTime
        };

        _db.MenuItems.Add(item);
        await _db.SaveChangesAsync();

        return ApiResponse<MenuItemDto>.Ok(new MenuItemDto(
            item.Id, item.HotelId, item.CategoryId, category.Name, item.Name, item.Description, item.Price, item.ImageUrl, item.IsVeg, item.IsAvailable, item.PreparationTime
        ), "Menu item created successfully");
    }

    public async Task<ApiResponse<MenuItemDto>> UpdateMenuItemAsync(Guid id, CreateMenuItemDto request)
    {
        var item = await _db.MenuItems.Include(m => m.Category).FirstOrDefaultAsync(m => m.Id == id);
        if (item == null) return ApiResponse<MenuItemDto>.Fail("Menu item not found");

        var category = await _db.RestaurantCategories.FirstOrDefaultAsync(c => c.Id == request.CategoryId);
        if (category == null) return ApiResponse<MenuItemDto>.Fail("Category not found");

        item.CategoryId = request.CategoryId;
        item.Name = request.Name.Trim();
        item.Description = request.Description;
        item.Price = request.Price;
        item.ImageUrl = request.ImageUrl;
        item.IsVeg = request.IsVeg;
        item.IsAvailable = request.IsAvailable;
        item.PreparationTime = request.PreparationTime;

        await _db.SaveChangesAsync();

        return ApiResponse<MenuItemDto>.Ok(new MenuItemDto(
            item.Id, item.HotelId, item.CategoryId, category.Name, item.Name, item.Description, item.Price, item.ImageUrl, item.IsVeg, item.IsAvailable, item.PreparationTime
        ), "Menu item updated successfully");
    }

    public async Task<ApiResponse<bool>> DeleteMenuItemAsync(Guid id)
    {
        var item = await _db.MenuItems.FirstOrDefaultAsync(m => m.Id == id);
        if (item == null) return ApiResponse<bool>.Fail("Menu item not found");

        _db.MenuItems.Remove(item);
        await _db.SaveChangesAsync();

        return ApiResponse<bool>.Ok(true, "Menu item deleted successfully");
    }

    // --- TABLES ---
    public async Task<ApiResponse<List<RestaurantTableDto>>> GetTablesAsync()
    {
        var tables = await _db.RestaurantTables.OrderBy(t => t.TableNumber).ToListAsync();
        var dtos = tables.Select(t => new RestaurantTableDto(
            t.Id, t.HotelId, t.TableNumber, t.Capacity, t.Status
        )).ToList();

        return ApiResponse<List<RestaurantTableDto>>.Ok(dtos);
    }

    public async Task<ApiResponse<RestaurantTableDto>> CreateTableAsync(CreateRestaurantTableDto request)
    {
        var hotelId = GetTenantHotelId();

        var existing = await _db.RestaurantTables.AnyAsync(t => t.TableNumber.ToLower() == request.TableNumber.Trim().ToLower());
        if (existing) return ApiResponse<RestaurantTableDto>.Fail("Table number already exists!");

        var table = new RestaurantTable
        {
            HotelId = hotelId,
            TableNumber = request.TableNumber.Trim(),
            Capacity = request.Capacity,
            Status = request.Status
        };

        _db.RestaurantTables.Add(table);
        await _db.SaveChangesAsync();

        return ApiResponse<RestaurantTableDto>.Ok(new RestaurantTableDto(
            table.Id, table.HotelId, table.TableNumber, table.Capacity, table.Status
        ), "Table created successfully");
    }

    public async Task<ApiResponse<RestaurantTableDto>> UpdateTableStatusAsync(Guid id, UpdateRestaurantTableStatusDto request)
    {
        var table = await _db.RestaurantTables.FirstOrDefaultAsync(t => t.Id == id);
        if (table == null) return ApiResponse<RestaurantTableDto>.Fail("Table not found");

        table.Status = request.Status;
        await _db.SaveChangesAsync();

        return ApiResponse<RestaurantTableDto>.Ok(new RestaurantTableDto(
            table.Id, table.HotelId, table.TableNumber, table.Capacity, table.Status
        ), "Table status updated");
    }

    public async Task<ApiResponse<bool>> DeleteTableAsync(Guid id)
    {
        var table = await _db.RestaurantTables.FirstOrDefaultAsync(t => t.Id == id);
        if (table == null) return ApiResponse<bool>.Fail("Table not found");

        _db.RestaurantTables.Remove(table);
        await _db.SaveChangesAsync();

        return ApiResponse<bool>.Ok(true, "Table deleted successfully");
    }

    // --- ORDERS & KOT ---
    public async Task<ApiResponse<List<RestaurantOrderDto>>> GetOrdersAsync(OrderStatus? status = null)
    {
        var query = _db.Orders
            .Include(o => o.Items).ThenInclude(i => i.MenuItem)
            .AsQueryable();

        if (status.HasValue) query = query.Where(o => o.Status == status.Value);

        var orders = await query.OrderByDescending(o => o.CreatedAt).ToListAsync();

        var tableIds = orders.Where(o => o.TableId.HasValue).Select(o => o.TableId!.Value).Distinct().ToList();
        var roomIds = orders.Where(o => o.RoomId.HasValue).Select(o => o.RoomId!.Value).Distinct().ToList();

        var tables = await _db.RestaurantTables.Where(t => tableIds.Contains(t.Id)).ToDictionaryAsync(t => t.Id, t => t.TableNumber);
        var rooms = await _db.Rooms.Where(r => roomIds.Contains(r.Id)).ToDictionaryAsync(r => r.Id, r => r.RoomNumber);

        var dtos = orders.Select(o => MapToOrderDto(o, tables, rooms)).ToList();

        return ApiResponse<List<RestaurantOrderDto>>.Ok(dtos);
    }

    public async Task<ApiResponse<RestaurantOrderDto>> GetOrderByIdAsync(Guid id)
    {
        var order = await _db.Orders
            .Include(o => o.Items).ThenInclude(i => i.MenuItem)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order == null) return ApiResponse<RestaurantOrderDto>.Fail("Order not found");

        var tables = await _db.RestaurantTables.ToDictionaryAsync(t => t.Id, t => t.TableNumber);
        var rooms = await _db.Rooms.ToDictionaryAsync(r => r.Id, r => r.RoomNumber);

        return ApiResponse<RestaurantOrderDto>.Ok(MapToOrderDto(order, tables, rooms));
    }

    public async Task<ApiResponse<RestaurantOrderDto>> CreateOrderAsync(CreateRestaurantOrderDto request)
    {
        var hotelId = GetTenantHotelId();

        if (request.Items == null || !request.Items.Any())
        {
            return ApiResponse<RestaurantOrderDto>.Fail("Order must contain at least one item");
        }

        // Fetch DB menu items to ensure backend price safety
        var menuItemIds = request.Items.Select(i => i.MenuItemId).Distinct().ToList();
        var dbMenuItems = await _db.MenuItems.Where(m => menuItemIds.Contains(m.Id)).ToDictionaryAsync(m => m.Id);

        foreach (var reqItem in request.Items)
        {
            if (!dbMenuItems.ContainsKey(reqItem.MenuItemId))
            {
                return ApiResponse<RestaurantOrderDto>.Fail($"Menu item ID {reqItem.MenuItemId} not found");
            }
        }

        var nextOrderNum = (await _db.Orders.CountAsync()) + 1001;
        var orderNumber = $"ORD-{nextOrderNum}";

        decimal subtotal = 0;
        var orderItems = new List<OrderItem>();
        var kotItemsSummary = new List<object>();

        foreach (var reqItem in request.Items)
        {
            var menuObj = dbMenuItems[reqItem.MenuItemId];
            var unitPrice = menuObj.Price;
            var itemTotal = unitPrice * reqItem.Quantity;
            subtotal += itemTotal;

            orderItems.Add(new OrderItem
            {
                HotelId = hotelId,
                MenuItemId = menuObj.Id,
                Quantity = reqItem.Quantity,
                UnitPrice = unitPrice,
                TotalPrice = itemTotal,
                Notes = reqItem.Notes
            });

            kotItemsSummary.Add(new
            {
                name = menuObj.Name,
                qty = reqItem.Quantity,
                notes = reqItem.Notes ?? ""
            });
        }

        decimal taxAmount = subtotal * 0.05m; // 5% GST on Restaurant Orders
        decimal discountAmount = 0m;
        decimal totalAmount = subtotal + taxAmount - discountAmount;

        string? tableNumStr = null;
        if (request.TableId.HasValue)
        {
            var tableObj = await _db.RestaurantTables.FirstOrDefaultAsync(t => t.Id == request.TableId.Value);
            if (tableObj != null)
            {
                tableNumStr = tableObj.TableNumber;
                tableObj.Status = "Occupied"; // Update table status to Occupied
            }
        }

        var order = new Order
        {
            HotelId = hotelId,
            OrderNumber = orderNumber,
            TableId = request.TableId,
            RoomId = request.RoomId,
            ReservationId = request.ReservationId,
            OrderType = request.OrderType,
            Status = OrderStatus.New,
            Subtotal = subtotal,
            TaxAmount = taxAmount,
            DiscountAmount = discountAmount,
            TotalAmount = totalAmount,
            PaymentMethod = request.PaymentMethod ?? "Cash",
            PaymentStatus = "Paid",
            Notes = request.Notes,
            Items = orderItems
        };

        _db.Orders.Add(order);
        await _db.SaveChangesAsync();

        // Create KOT Ticket automatically
        var kotNumber = $"KOT-{nextOrderNum}";
        var kotTicket = new KotTicket
        {
            HotelId = hotelId,
            KotNumber = kotNumber,
            OrderId = order.Id,
            TableNumber = tableNumStr,
            OrderType = request.OrderType,
            ItemsJson = System.Text.Json.JsonSerializer.Serialize(kotItemsSummary),
            Status = KotStatus.Pending,
            Notes = request.Notes
        };

        _db.KotTickets.Add(kotTicket);
        await _db.SaveChangesAsync();

        var tablesDict = request.TableId.HasValue && tableNumStr != null ? new Dictionary<Guid, string> { { request.TableId.Value, tableNumStr } } : new Dictionary<Guid, string>();
        var roomsDict = new Dictionary<Guid, string>();

        return ApiResponse<RestaurantOrderDto>.Ok(MapToOrderDto(order, tablesDict, roomsDict), "Order and KOT ticket created successfully");
    }

    public async Task<ApiResponse<RestaurantOrderDto>> UpdateOrderStatusAsync(Guid id, UpdateOrderStatusDto request)
    {
        var order = await _db.Orders
            .Include(o => o.Items).ThenInclude(i => i.MenuItem)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order == null) return ApiResponse<RestaurantOrderDto>.Fail("Order not found");

        order.Status = request.Status;

        // If order completed or cancelled, free the table if any
        if (request.Status == OrderStatus.Completed || request.Status == OrderStatus.Cancelled)
        {
            if (order.TableId.HasValue)
            {
                var tableObj = await _db.RestaurantTables.FirstOrDefaultAsync(t => t.Id == order.TableId.Value);
                if (tableObj != null)
                {
                    tableObj.Status = "Available";
                }
            }
        }

        await _db.SaveChangesAsync();

        var tables = await _db.RestaurantTables.ToDictionaryAsync(t => t.Id, t => t.TableNumber);
        var rooms = await _db.Rooms.ToDictionaryAsync(r => r.Id, r => r.RoomNumber);

        return ApiResponse<RestaurantOrderDto>.Ok(MapToOrderDto(order, tables, rooms), "Order status updated");
    }

    public async Task<ApiResponse<bool>> CancelOrderAsync(Guid id)
    {
        var order = await _db.Orders.FirstOrDefaultAsync(o => o.Id == id);
        if (order == null) return ApiResponse<bool>.Fail("Order not found");

        order.Status = OrderStatus.Cancelled;

        if (order.TableId.HasValue)
        {
            var tableObj = await _db.RestaurantTables.FirstOrDefaultAsync(t => t.Id == order.TableId.Value);
            if (tableObj != null) tableObj.Status = "Available";
        }

        await _db.SaveChangesAsync();

        return ApiResponse<bool>.Ok(true, "Order cancelled successfully");
    }

    public async Task<ApiResponse<List<KotTicketDto>>> GetKotTicketsAsync(KotStatus? status = null)
    {
        var query = _db.KotTickets.AsQueryable();

        if (status.HasValue) query = query.Where(k => k.Status == status.Value);

        var tickets = await query.OrderByDescending(k => k.CreatedAt).ToListAsync();

        var dtos = tickets.Select(k => new KotTicketDto(
            k.Id, k.HotelId, k.KotNumber, k.OrderId, k.TableNumber, k.OrderType, k.ItemsJson, k.Status, k.Notes, k.CreatedAt
        )).ToList();

        return ApiResponse<List<KotTicketDto>>.Ok(dtos);
    }

    public async Task<ApiResponse<KotTicketDto>> UpdateKotStatusAsync(Guid id, UpdateKotStatusDto request)
    {
        var ticket = await _db.KotTickets.FirstOrDefaultAsync(k => k.Id == id);
        if (ticket == null) return ApiResponse<KotTicketDto>.Fail("KOT ticket not found");

        ticket.Status = request.Status;
        await _db.SaveChangesAsync();

        return ApiResponse<KotTicketDto>.Ok(new KotTicketDto(
            ticket.Id, ticket.HotelId, ticket.KotNumber, ticket.OrderId, ticket.TableNumber, ticket.OrderType, ticket.ItemsJson, ticket.Status, ticket.Notes, ticket.CreatedAt
        ), "KOT status updated");
    }

    private static RestaurantOrderDto MapToOrderDto(Order o, Dictionary<Guid, string> tables, Dictionary<Guid, string> rooms)
    {
        var tableNum = o.TableId.HasValue && tables.TryGetValue(o.TableId.Value, out var tn) ? tn : null;
        var roomNum = o.RoomId.HasValue && rooms.TryGetValue(o.RoomId.Value, out var rn) ? rn : null;

        var itemDtos = o.Items.Select(i => new RestaurantOrderItemDto(
            i.Id, i.MenuItemId, i.MenuItem?.Name ?? "", i.Quantity, i.UnitPrice, i.TotalPrice, i.Notes
        )).ToList();

        return new RestaurantOrderDto(
            o.Id, o.HotelId, o.OrderNumber, o.TableId, tableNum, o.RoomId, roomNum, o.ReservationId,
            o.OrderType, o.Status, o.Subtotal, o.TaxAmount, o.DiscountAmount, o.TotalAmount,
            o.PaymentMethod, o.PaymentStatus, o.Notes, o.CreatedAt, itemDtos
        );
    }
}
