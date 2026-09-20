using HotelSaaS.Application.Common.Interfaces;
using HotelSaaS.Application.Common.Models;
using HotelSaaS.Application.DTOs;
using HotelSaaS.Application.Interfaces;
using HotelSaaS.Domain.Entities;
using HotelSaaS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HotelSaaS.Infrastructure.Services;

public class PosService : IPosService
{
    private readonly ApplicationDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly ITursoSyncService? _tursoSync;

    public PosService(ApplicationDbContext db, ITenantContext tenantContext, ITursoSyncService? tursoSync = null)
    {
        _db = db;
        _tenantContext = tenantContext;
        _tursoSync = tursoSync;
    }

    private Guid GetTenantHotelId()
    {
        if (_tenantContext.HotelId.HasValue && _tenantContext.HotelId.Value != Guid.Empty)
        {
            return _tenantContext.HotelId.Value;
        }

        var firstHotel = _db.Hotels.IgnoreQueryFilters().FirstOrDefault();
        if (firstHotel != null)
        {
            return firstHotel.Id;
        }

        return Guid.Parse("00000000-0000-0000-0000-000000000001");
    }

    public async Task<ApiResponse<List<PosCategoryDto>>> GetMenuCategoriesAsync()
    {
        var hotelId = GetTenantHotelId();
        var isSuperAdmin = _tenantContext?.IsSuperAdmin ?? false;
        string? filterHotelId = !isSuperAdmin ? hotelId.ToString() : null;

        if (_tursoSync != null)
        {
            var tursoCategories = await _tursoSync.FetchPosCategoriesFromTursoAsync(filterHotelId);
            if (tursoCategories != null && tursoCategories.Count > 0)
            {
                return ApiResponse<List<PosCategoryDto>>.Ok(tursoCategories);
            }
        }

        var query = _db.PosCategories
            .Include(c => c.MenuItems)
            .AsQueryable();

        if (!isSuperAdmin)
        {
            query = query.Where(c => c.HotelId == hotelId);
        }

        var categories = await query
            .OrderBy(c => c.DisplayOrder)
            .ToListAsync();

        var dtos = categories.Select(c => new PosCategoryDto(
            c.Id,
            c.Name,
            c.Slug,
            c.DisplayOrder,
            c.MenuItems.Select(m => new PosMenuItemDto(
                m.Id, m.CategoryId, c.Name, m.Name, m.Description, m.Price, m.ImageUrl, m.IsAvailable
            )).ToList()
        )).ToList();

        return ApiResponse<List<PosCategoryDto>>.Ok(dtos);
    }

    public async Task<ApiResponse<List<PosOrderDto>>> GetActiveOrdersAsync()
    {
        var hotelId = GetTenantHotelId();
        var isSuperAdmin = _tenantContext?.IsSuperAdmin ?? false;

        var query = _db.PosOrders
            .Include(o => o.OrderItems)
            .Include(o => o.Room)
            .Include(o => o.Reservation)
            .ThenInclude(r => r!.Customer)
            .AsQueryable();

        if (!isSuperAdmin)
        {
            query = query.Where(o => o.HotelId == hotelId);
        }

        var orders = await query
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        return ApiResponse<List<PosOrderDto>>.Ok(orders.Select(MapToDto).ToList());
    }

    public async Task<ApiResponse<PosOrderDto>> CreatePosOrderAsync(CreatePosOrderDto request)
    {
        var hotelId = GetTenantHotelId();

        if (request.Items == null || request.Items.Count == 0)
            return ApiResponse<PosOrderDto>.Fail("Order cart cannot be empty");

        var itemIds = request.Items.Select(i => i.MenuItemId).ToList();
        var menuItems = await _db.PosMenuItems.Where(m => itemIds.Contains(m.Id)).ToDictionaryAsync(m => m.Id);

        decimal subtotal = 0;
        var orderItemsList = new List<PosOrderItem>();

        foreach (var itemReq in request.Items)
        {
            if (!menuItems.TryGetValue(itemReq.MenuItemId, out var mi))
                continue;

            var itemSubtotal = mi.Price * itemReq.Quantity;
            subtotal += itemSubtotal;

            orderItemsList.Add(new PosOrderItem
            {
                MenuItemId = mi.Id,
                ItemName = mi.Name,
                UnitPrice = mi.Price,
                Quantity = itemReq.Quantity,
                Subtotal = itemSubtotal,
                Notes = itemReq.Notes
            });
        }

        var tax = subtotal * 0.05m; // 5% GST on Restaurant Food
        var total = subtotal + tax;

        Guid? validReservationId = null;
        if (request.ReservationId.HasValue && request.ReservationId.Value != Guid.Empty)
        {
            var resExists = await _db.Reservations.IgnoreQueryFilters().AnyAsync(r => r.Id == request.ReservationId.Value);
            if (resExists) validReservationId = request.ReservationId.Value;
        }

        Guid? validRoomId = null;
        if (request.RoomId.HasValue && request.RoomId.Value != Guid.Empty)
        {
            var roomExists = await _db.Rooms.IgnoreQueryFilters().AnyAsync(r => r.Id == request.RoomId.Value);
            if (roomExists) validRoomId = request.RoomId.Value;
        }

        var orderNumber = "KOT-" + DateTime.UtcNow.ToString("HHmmss") + "-" + Random.Shared.Next(100, 999);

        var posOrder = new PosOrder
        {
            HotelId = hotelId,
            OrderNumber = orderNumber,
            ReservationId = validReservationId,
            RoomId = validRoomId,
            TableNumber = request.TableNumber,
            OrderType = request.OrderType,
            Subtotal = subtotal,
            Tax = tax,
            Total = total,
            OrderStatus = "Pending",
            PaymentStatus = request.ChargeToRoom ? "ChargedToRoom" : "Pending",
            OrderItems = orderItemsList
        };

        _db.PosOrders.Add(posOrder);

        // If direct Room Charge
        if (request.ChargeToRoom && request.ReservationId.HasValue)
        {
            var res = await _db.Reservations
                .Include(r => r.Customer)
                .Include(r => r.Room)
                .FirstOrDefaultAsync(r => r.Id == request.ReservationId.Value);

            if (res != null)
            {
                res.TotalAmount += total;
                res.DueAmount += total;

                if (_tursoSync != null)
                {
                    try
                    {
                        await _tursoSync.SyncReservationAsync(
                            res.Id.ToString(),
                            res.BookingNumber,
                            res.CustomerId.ToString(),
                            res.RoomId.ToString(),
                            res.CheckInDate.ToString("yyyy-MM-dd"),
                            res.CheckOutDate.ToString("yyyy-MM-dd"),
                            res.TotalAmount,
                            res.PaidAmount,
                            res.PaymentStatus.ToString(),
                            res.BookingStatus.ToString(),
                            res.BookingSource,
                            res.Room?.RoomNumber ?? "",
                            res.Customer?.Phone ?? "",
                            res.HotelId.ToString(),
                            res.Adults,
                            res.Children
                        );
                    }
                    catch { }
                }
            }
        }

        await _db.SaveChangesAsync();

        if (_tursoSync != null)
        {
            try
            {
                var hId = hotelId.ToString();
                var orderSql = $"INSERT INTO pos_orders (id, hotel_id, order_number, reservation_id, room_id, table_number, order_type, subtotal, tax, total, order_status, payment_status) VALUES ('{posOrder.Id}', '{hId}', '{orderNumber}', '{request.ReservationId}', '{request.RoomId}', '{request.TableNumber}', '{request.OrderType}', {subtotal}, {tax}, {total}, 'Pending', '{posOrder.PaymentStatus}') ON CONFLICT(id) DO UPDATE SET total={total}, payment_status='{posOrder.PaymentStatus}';";
                await _tursoSync.ExecuteSqlAsync(orderSql);
            }
            catch { }
        }

        return ApiResponse<PosOrderDto>.Ok(MapToDto(posOrder), $"Kitchen Order {orderNumber} sent to Chef!");
    }

    public async Task<ApiResponse<PosOrderDto>> UpdateOrderStatusAsync(Guid orderId, string status)
    {
        var order = await _db.PosOrders
            .Include(o => o.OrderItems)
            .Include(o => o.Room)
            .Include(o => o.Reservation)
            .ThenInclude(r => r!.Customer)
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order == null)
            return ApiResponse<PosOrderDto>.Fail("Order not found");

        order.OrderStatus = status;
        await _db.SaveChangesAsync();

        if (_tursoSync != null)
        {
            try
            {
                var updateSql = $"UPDATE pos_orders SET order_status='{status.Replace("'", "''")}' WHERE id='{orderId}' OR id='{order.Id}';";
                await _tursoSync.ExecuteSqlAsync(updateSql);
            }
            catch { }
        }

        return ApiResponse<PosOrderDto>.Ok(MapToDto(order), $"Order status updated to {status}");
    }

    public async Task<ApiResponse<PosMenuItemDto>> CreateMenuItemAsync(CreatePosMenuItemDto request)
    {
        var hotelId = GetTenantHotelId();
        if (string.IsNullOrWhiteSpace(request.Name))
            return ApiResponse<PosMenuItemDto>.Fail("Dish name is required");

        var categoryName = string.IsNullOrWhiteSpace(request.CategoryName) ? "Starters & Appetizers" : request.CategoryName.Trim();
        var category = await _db.PosCategories
            .FirstOrDefaultAsync(c => c.Name.ToLower() == categoryName.ToLower());

        if (category == null)
        {
            category = new PosCategory
            {
                HotelId = hotelId,
                Name = categoryName,
                Slug = categoryName.ToLower().Replace(" ", "-"),
                DisplayOrder = (await _db.PosCategories.CountAsync()) + 1
            };
            _db.PosCategories.Add(category);
            await _db.SaveChangesAsync();
        }

        var menuItem = new PosMenuItem
        {
            HotelId = hotelId,
            CategoryId = category.Id,
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            Price = request.Price,
            IsAvailable = true
        };

        _db.PosMenuItems.Add(menuItem);
        await _db.SaveChangesAsync();

        if (_tursoSync != null)
        {
            try
            {
                var catSql = $"INSERT INTO pos_categories (id, trainid, hotel_id, name, slug, display_order) VALUES ('{category.Id}', (SELECT COALESCE(MAX(trainid), 0) + 1 FROM pos_categories), 'hotel-5', '{category.Name.Replace("'", "''")}', '{category.Slug}', {category.DisplayOrder}) ON CONFLICT(id) DO UPDATE SET name='{category.Name.Replace("'", "''")}';";
                var itemSql = $"INSERT INTO pos_menu_items (id, trainid, hotel_id, category_id, name, description, price, is_available) VALUES ('{menuItem.Id}', (SELECT COALESCE(MAX(trainid), 0) + 1 FROM pos_menu_items), 'hotel-5', '{category.Id}', '{menuItem.Name.Replace("'", "''")}', '{menuItem.Description?.Replace("'", "''")}', {menuItem.Price}, 1) ON CONFLICT(id) DO UPDATE SET name='{menuItem.Name.Replace("'", "''")}', price={menuItem.Price};";
                await _tursoSync.ExecuteSqlAsync(catSql);
                await _tursoSync.ExecuteSqlAsync(itemSql);
            }
            catch { }
        }

        var dto = new PosMenuItemDto(
            menuItem.Id,
            category.Id,
            category.Name,
            menuItem.Name,
            menuItem.Description,
            menuItem.Price,
            menuItem.ImageUrl,
            menuItem.IsAvailable
        );

        return ApiResponse<PosMenuItemDto>.Ok(dto, "Dish added to Menu successfully!");
    }

    public async Task<ApiResponse<PosMenuItemDto>> UpdateMenuItemAsync(Guid itemId, UpdatePosMenuItemDto request)
    {
        var menuItem = await _db.PosMenuItems.Include(m => m.Category).FirstOrDefaultAsync(m => m.Id == itemId);
        if (menuItem == null)
        {
            if (_tursoSync != null)
            {
                try
                {
                    await _tursoSync.UpdateMenuItemInTursoAsync(
                        itemId.ToString(),
                        request.Name.Trim(),
                        request.Description?.Trim() ?? "",
                        request.Price,
                        request.CategoryName?.Trim() ?? "Starters & Appetizers",
                        request.IsAvailable
                    );
                }
                catch { }
            }
            var fallbackDto = new PosMenuItemDto(
                itemId,
                Guid.Empty,
                request.CategoryName ?? "General",
                request.Name,
                request.Description,
                request.Price,
                null,
                request.IsAvailable
            );
            return ApiResponse<PosMenuItemDto>.Ok(fallbackDto, "Dish updated in database successfully!");
        }

        if (!string.IsNullOrWhiteSpace(request.CategoryName))
        {
            var categoryName = request.CategoryName.Trim();
            var category = await _db.PosCategories.FirstOrDefaultAsync(c => c.Name.ToLower() == categoryName.ToLower());
            if (category == null)
            {
                var hotelId = GetTenantHotelId();
                category = new PosCategory
                {
                    HotelId = hotelId,
                    Name = categoryName,
                    Slug = categoryName.ToLower().Replace(" ", "-"),
                    DisplayOrder = (await _db.PosCategories.CountAsync()) + 1
                };
                _db.PosCategories.Add(category);
                await _db.SaveChangesAsync();
            }
            menuItem.CategoryId = category.Id;
            menuItem.Category = category;
        }

        menuItem.Name = request.Name.Trim();
        menuItem.Description = request.Description?.Trim();
        menuItem.Price = request.Price;
        menuItem.IsAvailable = request.IsAvailable;

        await _db.SaveChangesAsync();

        if (_tursoSync != null)
        {
            try
            {
                await _tursoSync.UpdateMenuItemInTursoAsync(
                    itemId.ToString(),
                    menuItem.Name,
                    menuItem.Description ?? "",
                    menuItem.Price,
                    menuItem.Category?.Name ?? request.CategoryName ?? "General",
                    menuItem.IsAvailable
                );
            }
            catch { }
        }

        var dto = new PosMenuItemDto(
            menuItem.Id,
            menuItem.CategoryId,
            menuItem.Category?.Name ?? "General",
            menuItem.Name,
            menuItem.Description,
            menuItem.Price,
            menuItem.ImageUrl,
            menuItem.IsAvailable
        );

        return ApiResponse<PosMenuItemDto>.Ok(dto, "Dish updated successfully!");
    }

    public async Task<ApiResponse<bool>> DeleteMenuItemAsync(Guid itemId)
    {
        var menuItem = await _db.PosMenuItems.FirstOrDefaultAsync(m => m.Id == itemId);
        if (menuItem != null)
        {
            _db.PosMenuItems.Remove(menuItem);
            await _db.SaveChangesAsync();
        }

        if (_tursoSync != null)
        {
            try
            {
                await _tursoSync.DeleteMenuItemFromTursoAsync(itemId.ToString());
            }
            catch { }
        }

        return ApiResponse<bool>.Ok(true, "Dish removed from menu successfully!");
    }

    private static PosOrderDto MapToDto(PosOrder o) => new(
        o.Id,
        o.OrderNumber,
        o.ReservationId,
        o.Room?.RoomNumber ?? "",
        o.Reservation?.Customer?.FullName ?? "Guest",
        o.TableNumber,
        o.OrderType,
        o.Subtotal,
        o.Tax,
        o.Total,
        o.OrderStatus,
        o.PaymentStatus,
        o.CreatedAt,
        o.OrderItems.Select(i => new PosOrderItemDto(
            i.Id, i.MenuItemId, i.ItemName, i.UnitPrice, i.Quantity, i.Subtotal, i.Notes
        )).ToList()
    );

    private async Task SeedDefaultMenuAsync(Guid hotelId)
    {
        var starters = new PosCategory { HotelId = hotelId, Name = "Starters & Appetizers", Slug = "starters", DisplayOrder = 1 };
        var mainCourse = new PosCategory { HotelId = hotelId, Name = "Main Course", Slug = "main-course", DisplayOrder = 2 };
        var beverages = new PosCategory { HotelId = hotelId, Name = "Beverages & Drinks", Slug = "beverages", DisplayOrder = 3 };

        _db.PosCategories.AddRange(starters, mainCourse, beverages);
        await _db.SaveChangesAsync();

        _db.PosMenuItems.AddRange(
            new PosMenuItem { HotelId = hotelId, CategoryId = starters.Id, Name = "Paneer Tikka Grill", Price = 340, Description = "Cottage cheese marinated in Indian spices", IsAvailable = true },
            new PosMenuItem { HotelId = hotelId, CategoryId = starters.Id, Name = "Crispy Chicken Wings", Price = 380, Description = "Deep fried tossed in BBQ sauce", IsAvailable = true },
            new PosMenuItem { HotelId = hotelId, CategoryId = mainCourse.Id, Name = "Butter Chicken Special", Price = 480, Description = "Tandoori chicken in rich tomato gravy", IsAvailable = true },
            new PosMenuItem { HotelId = hotelId, CategoryId = mainCourse.Id, Name = "Dal Makhani & Naan Combo", Price = 390, Description = "Slow cooked black lentils with butter naan", IsAvailable = true },
            new PosMenuItem { HotelId = hotelId, CategoryId = beverages.Id, Name = "Fresh Mango Lassi", Price = 140, Description = "Sweet chilled yogurt drink", IsAvailable = true },
            new PosMenuItem { HotelId = hotelId, CategoryId = beverages.Id, Name = "Cold Coffee Ice Cream", Price = 180, Description = "Creamy espresso with vanilla scoop", IsAvailable = true }
        );

        await _db.SaveChangesAsync();
    }
}
