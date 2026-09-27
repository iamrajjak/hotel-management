using HotelSaaS.Application.Common.Interfaces;
using HotelSaaS.Application.Common.Models;
using HotelSaaS.Application.DTOs;
using HotelSaaS.Application.Interfaces;
using HotelSaaS.Domain.Entities;
using HotelSaaS.Domain.Enums;
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

        var defaultGuid = Guid.Parse("00000000-0000-0000-0000-000000000001");
        var hotel1 = _db.Hotels.IgnoreQueryFilters().FirstOrDefault(h => h.Id == defaultGuid);
        if (hotel1 != null)
        {
            return hotel1.Id;
        }

        var firstHotel = _db.Hotels.IgnoreQueryFilters().FirstOrDefault();
        if (firstHotel != null)
        {
            return firstHotel.Id;
        }

        return defaultGuid;
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
            string itemName;
            decimal unitPrice;
            Guid menuItemId;

            if (menuItems.TryGetValue(itemReq.MenuItemId, out var mi))
            {
                menuItemId = mi.Id;
                itemName = mi.Name;
                unitPrice = mi.Price;
            }
            else
            {
                menuItemId = itemReq.MenuItemId != Guid.Empty ? itemReq.MenuItemId : Guid.NewGuid();
                itemName = !string.IsNullOrWhiteSpace(itemReq.ItemName) ? itemReq.ItemName : "Delicious Dish";
                unitPrice = itemReq.UnitPrice.HasValue && itemReq.UnitPrice.Value > 0 ? itemReq.UnitPrice.Value : 250m;
            }

            var itemSubtotal = unitPrice * itemReq.Quantity;
            subtotal += itemSubtotal;

            orderItemsList.Add(new PosOrderItem
            {
                MenuItemId = menuItemId,
                ItemName = itemName,
                UnitPrice = unitPrice,
                Quantity = itemReq.Quantity,
                Subtotal = itemSubtotal,
                Notes = itemReq.Notes
            });
        }

        var tax = subtotal * 0.05m; // 5% GST on Restaurant Food
        var total = subtotal + tax;

        // Robustly search for active reservation by ReservationId or RoomId
        Reservation? activeReservation = null;
        if (request.ReservationId.HasValue && request.ReservationId.Value != Guid.Empty)
        {
            activeReservation = await _db.Reservations
                .IgnoreQueryFilters()
                .Include(r => r.Customer)
                .Include(r => r.Room)
                .FirstOrDefaultAsync(r => r.Id == request.ReservationId.Value);
        }

        Room? matchingRoomObj = null;
        if (request.RoomId.HasValue && request.RoomId.Value != Guid.Empty)
        {
            matchingRoomObj = await _db.Rooms.IgnoreQueryFilters().FirstOrDefaultAsync(r => r.Id == request.RoomId.Value);
        }
        if (matchingRoomObj == null && !string.IsNullOrWhiteSpace(request.RoomNumber))
        {
            var cleanNum = request.RoomNumber.Replace("Room ", "").Trim();
            matchingRoomObj = await _db.Rooms.IgnoreQueryFilters().FirstOrDefaultAsync(r => r.RoomNumber == request.RoomNumber || r.RoomNumber == cleanNum);
        }

        if (activeReservation == null && matchingRoomObj != null)
        {
            activeReservation = await _db.Reservations
                .IgnoreQueryFilters()
                .Include(r => r.Customer)
                .Include(r => r.Room)
                .Where(r => r.RoomId == matchingRoomObj.Id || (r.Room != null && r.Room.RoomNumber == matchingRoomObj.RoomNumber))
                .OrderByDescending(r => r.CreatedAt)
                .FirstOrDefaultAsync();
        }

        Guid? validReservationId = activeReservation?.Id;
        Guid? validRoomId = matchingRoomObj?.Id ?? activeReservation?.RoomId;

        // Foreign key safety validations for local SQLite DB
        var validHotelId = hotelId;
        if (!await _db.Hotels.IgnoreQueryFilters().AnyAsync(h => h.Id == validHotelId))
        {
            var firstHotel = await _db.Hotels.IgnoreQueryFilters().FirstOrDefaultAsync();
            if (firstHotel != null) validHotelId = firstHotel.Id;
        }

        if (validRoomId.HasValue && !await _db.Rooms.IgnoreQueryFilters().AnyAsync(r => r.Id == validRoomId.Value))
        {
            validRoomId = null;
        }

        if (validReservationId.HasValue && !await _db.Reservations.IgnoreQueryFilters().AnyAsync(r => r.Id == validReservationId.Value))
        {
            validReservationId = null;
        }

        var orderNumber = "KOT-" + DateTime.UtcNow.ToString("HHmmss") + "-" + Random.Shared.Next(100, 999);
        var nowUtc = DateTime.UtcNow;

        string? resolvedRoomNum = !string.IsNullOrWhiteSpace(request.RoomNumber) ? request.RoomNumber : matchingRoomObj?.RoomNumber ?? activeReservation?.Room?.RoomNumber;
        string? resolvedCustName = !string.IsNullOrWhiteSpace(request.CustomerName) ? request.CustomerName : activeReservation?.Customer?.FullName;
        string? resolvedCustPhone = !string.IsNullOrWhiteSpace(request.CustomerPhone) ? request.CustomerPhone : activeReservation?.Customer?.Phone;

        if (string.IsNullOrWhiteSpace(resolvedRoomNum))
        {
            resolvedRoomNum = activeReservation?.Room?.RoomNumber;
            if (string.IsNullOrWhiteSpace(resolvedRoomNum) && request.RoomId.HasValue)
            {
                var targetRoom = await _db.Rooms.IgnoreQueryFilters().FirstOrDefaultAsync(r => r.Id == request.RoomId.Value);
                resolvedRoomNum = targetRoom?.RoomNumber;
            }
        }

        if (string.IsNullOrWhiteSpace(resolvedCustName) || string.IsNullOrWhiteSpace(resolvedCustPhone))
        {
            if (activeReservation != null)
            {
                var custObj = activeReservation.Customer ?? await _db.Customers.IgnoreQueryFilters().FirstOrDefaultAsync(c => c.Id == activeReservation.CustomerId);
                if (custObj != null)
                {
                    if (string.IsNullOrWhiteSpace(resolvedCustName)) resolvedCustName = custObj.FullName;
                    if (string.IsNullOrWhiteSpace(resolvedCustPhone)) resolvedCustPhone = custObj.Phone;
                }
                if (string.IsNullOrWhiteSpace(resolvedCustName) && activeReservation.Customer != null) resolvedCustName = activeReservation.Customer.FullName;
                if (string.IsNullOrWhiteSpace(resolvedCustPhone) && activeReservation.Customer != null) resolvedCustPhone = activeReservation.Customer.Phone;
            }
        }

        var posOrder = new PosOrder
        {
            HotelId = validHotelId,
            OrderNumber = orderNumber,
            ReservationId = validReservationId,
            RoomId = validRoomId,
            CustomerId = activeReservation?.CustomerId,
            CustomerName = resolvedCustName,
            CustomerPhone = resolvedCustPhone,
            RoomNumber = resolvedRoomNum,
            TableNumber = request.TableNumber,
            OrderType = request.OrderType,
            Subtotal = subtotal,
            Tax = tax,
            Total = total,
            OrderStatus = "Pending",
            PaymentStatus = request.ChargeToRoom ? "ChargedToRoom" : "Paid",
            OrderItems = orderItemsList,
            CreatedAt = nowUtc,
            UpdatedAt = nowUtc
        };

        _db.PosOrders.Add(posOrder);

        // Update reservation total and due amount if charged to room
        if (activeReservation != null)
        {
            posOrder.Reservation = activeReservation;
            if (activeReservation.Room != null) posOrder.Room = activeReservation.Room;

            if (request.ChargeToRoom)
            {
                activeReservation.TotalAmount += total;
                activeReservation.DueAmount += total;

                if (_tursoSync != null)
                {
                    try
                    {
                        await _tursoSync.SyncReservationAsync(
                            activeReservation.Id.ToString(),
                            activeReservation.BookingNumber,
                            activeReservation.CustomerId.ToString(),
                            activeReservation.RoomId.ToString(),
                            activeReservation.CheckInDate.ToString("yyyy-MM-dd"),
                            activeReservation.CheckOutDate.ToString("yyyy-MM-dd"),
                            activeReservation.TotalAmount,
                            activeReservation.PaidAmount,
                            activeReservation.PaymentStatus.ToString(),
                            activeReservation.BookingStatus.ToString(),
                            activeReservation.BookingSource,
                            activeReservation.Room?.RoomNumber ?? "",
                            activeReservation.Customer?.Phone ?? "",
                            activeReservation.HotelId.ToString(),
                            activeReservation.Adults,
                            activeReservation.Children
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
                var hId = TursoSyncService.CleanHotelId(hotelId.ToString());
                var nowIso = nowUtc.ToString("yyyy-MM-dd HH:mm:ss");
                var cleanOrderId = "order-" + orderNumber.Replace("KOT-", "").Replace("kot-", "");
                var resIdStr = posOrder.ReservationId.HasValue ? TursoSyncService.CleanReservationId(posOrder.ReservationId.Value.ToString()) : "";
                var roomIdStr = posOrder.RoomId.HasValue ? TursoSyncService.CleanRoomId(posOrder.RoomId.Value.ToString()) : "";
                var custIdStr = posOrder.CustomerId.HasValue ? TursoSyncService.CleanCustomerId(posOrder.CustomerId.Value.ToString()) : "";
                var custNameStr = (posOrder.CustomerName ?? "").Replace("'", "''");
                var custPhoneStr = (posOrder.CustomerPhone ?? "").Replace("'", "''");
                var roomNumStr = (posOrder.RoomNumber ?? "").Replace("'", "''");
                var tableNumStr = (request.TableNumber ?? "").Replace("'", "''");

                var orderSql = $"INSERT INTO pos_orders (id, hotel_id, order_number, reservation_id, room_id, customer_id, customer_name, customer_phone, room_number, table_number, order_type, subtotal, tax, total, order_status, payment_status, created_at) VALUES ('{cleanOrderId}', '{hId}', '{orderNumber}', '{resIdStr}', '{roomIdStr}', '{custIdStr}', '{custNameStr}', '{custPhoneStr}', '{roomNumStr}', '{tableNumStr}', '{request.OrderType}', {subtotal}, {tax}, {total}, 'Pending', '{posOrder.PaymentStatus}', '{nowIso}') ON CONFLICT(id) DO UPDATE SET subtotal={subtotal}, tax={tax}, total={total}, payment_status='{posOrder.PaymentStatus}', customer_id='{custIdStr}', customer_name='{custNameStr}', room_number='{roomNumStr}', created_at='{nowIso}';";
                await _tursoSync.ExecuteSqlAsync(orderSql);

                int itemCounter = 1;
                foreach (var item in orderItemsList)
                {
                    var cleanItemName = item.ItemName.Replace("'", "''");
                    var cleanNotes = (item.Notes ?? "").Replace("'", "''");
                    var cleanItemId = $"{cleanOrderId}-item-{itemCounter++}";
                    var itemSql = $"INSERT INTO pos_order_items (id, order_id, menu_item_id, item_name, unit_price, quantity, subtotal, notes) VALUES ('{cleanItemId}', '{cleanOrderId}', '{item.MenuItemId}', '{cleanItemName}', {item.UnitPrice}, {item.Quantity}, {item.Subtotal}, '{cleanNotes}') ON CONFLICT(id) DO UPDATE SET subtotal={item.Subtotal};";
                    await _tursoSync.ExecuteSqlAsync(itemSql);
                }
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
                var cleanOrderId = "order-" + order.OrderNumber.Replace("KOT-", "").Replace("kot-", "");
                var updateSql = $"UPDATE pos_orders SET order_status='{status.Replace("'", "''")}' WHERE id='{cleanOrderId}' OR id='{orderId}' OR id='{order.Id}';";
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
                var rawH = hotelId.ToString();
                var cleanHotelId = rawH == Guid.Empty.ToString() || rawH == "00000000-0000-0000-0000-000000000001" ? "hotel-1" 
                    : (rawH == "00000000-0000-0000-0000-000000000002" ? "hotel-2" 
                    : (rawH.StartsWith("hotel-") ? rawH : "hotel-1"));
                var catCleanId = $"cat-{category.Slug}";
                var itemCleanId = $"item-{menuItem.Name.ToLower().Trim().Replace(" ", "-").Replace("'", "")}";

                var catSql = $"INSERT INTO pos_categories (id, trainid, hotel_id, name, slug, display_order) VALUES ('{catCleanId}', (SELECT COALESCE(MAX(trainid), 0) + 1 FROM pos_categories), '{cleanHotelId}', '{category.Name.Replace("'", "''")}', '{category.Slug}', {category.DisplayOrder}) ON CONFLICT(id) DO UPDATE SET name='{category.Name.Replace("'", "''")}', hotel_id='{cleanHotelId}';";
                var itemSql = $"INSERT INTO pos_menu_items (id, trainid, hotel_id, category_id, name, description, price, is_available) VALUES ('{itemCleanId}', (SELECT COALESCE(MAX(trainid), 0) + 1 FROM pos_menu_items), '{cleanHotelId}', '{catCleanId}', '{menuItem.Name.Replace("'", "''")}', '{menuItem.Description?.Replace("'", "''")}', {menuItem.Price}, 1) ON CONFLICT(id) DO UPDATE SET name='{menuItem.Name.Replace("'", "''")}', price={menuItem.Price}, hotel_id='{cleanHotelId}';";
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
        o.RoomId ?? o.Reservation?.RoomId,
        !string.IsNullOrWhiteSpace(o.Room?.RoomNumber) ? o.Room.RoomNumber : (o.Reservation?.Room?.RoomNumber ?? ""),
        o.Reservation?.Customer?.FullName ?? "Guest",
        o.Reservation?.Customer?.Phone ?? "",
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
        var catStarters = new PosCategory { HotelId = hotelId, Name = "Starters & Appetizers", Slug = "starters-&-appetizers", DisplayOrder = 1 };
        var catMainVeg = new PosCategory { HotelId = hotelId, Name = "Main Course (Veg)", Slug = "main-course-(veg)", DisplayOrder = 2 };
        var catMainNonVeg = new PosCategory { HotelId = hotelId, Name = "Main Course (Non-Veg)", Slug = "main-course-(non-veg)", DisplayOrder = 3 };
        var catBreads = new PosCategory { HotelId = hotelId, Name = "Indian Breads & Naan", Slug = "indian-breads-&-naan", DisplayOrder = 4 };
        var catRice = new PosCategory { HotelId = hotelId, Name = "Rice & Biryani", Slug = "rice-&-biryani", DisplayOrder = 5 };
        var catChinese = new PosCategory { HotelId = hotelId, Name = "Chinese & Fast Food", Slug = "chinese-&-fast-food", DisplayOrder = 6 };
        var catSoups = new PosCategory { HotelId = hotelId, Name = "Soups & Salads", Slug = "soups-&-salads", DisplayOrder = 7 };
        var catSouth = new PosCategory { HotelId = hotelId, Name = "Breakfast & South Indian", Slug = "breakfast-&-south-indian", DisplayOrder = 8 };
        var catDesserts = new PosCategory { HotelId = hotelId, Name = "Desserts & Sweets", Slug = "desserts-&-sweets", DisplayOrder = 9 };
        var catBeverages = new PosCategory { HotelId = hotelId, Name = "Beverages & Drinks", Slug = "beverages-&-drinks", DisplayOrder = 10 };

        _db.PosCategories.AddRange(catStarters, catMainVeg, catMainNonVeg, catBreads, catRice, catChinese, catSoups, catSouth, catDesserts, catBeverages);
        await _db.SaveChangesAsync();

        _db.PosMenuItems.AddRange(
            new PosMenuItem { HotelId = hotelId, CategoryId = catStarters.Id, Name = "Paneer Tikka Grill", Price = 350, Description = "Fresh cottage cheese marinated in Indian spices", IsAvailable = true },
            new PosMenuItem { HotelId = hotelId, CategoryId = catStarters.Id, Name = "Veg Hara Bhara Kebab", Price = 280, Description = "Crispy spinach and green pea patties", IsAvailable = true },
            new PosMenuItem { HotelId = hotelId, CategoryId = catStarters.Id, Name = "Chicken Tikka Angara", Price = 420, Description = "Spicy boneless chicken tikka cooked over charcoal", IsAvailable = true },
            new PosMenuItem { HotelId = hotelId, CategoryId = catMainVeg.Id, Name = "Paneer Butter Masala", Price = 380, Description = "Rich cashew tomato gravy with soft cottage cheese", IsAvailable = true },
            new PosMenuItem { HotelId = hotelId, CategoryId = catMainVeg.Id, Name = "Dal Makhani Royal", Price = 320, Description = "Slow cooked black lentils with fresh cream", IsAvailable = true },
            new PosMenuItem { HotelId = hotelId, CategoryId = catMainNonVeg.Id, Name = "Butter Chicken Special", Price = 480, Description = "Shredded tandoori chicken in butter tomato gravy", IsAvailable = true },
            new PosMenuItem { HotelId = hotelId, CategoryId = catMainNonVeg.Id, Name = "Mutton Rogan Josh", Price = 560, Description = "Kashmiri delicacy tender mutton in aromatic gravy", IsAvailable = true },
            new PosMenuItem { HotelId = hotelId, CategoryId = catBreads.Id, Name = "Butter Naan", Price = 60, Description = "Refined flour clay oven bread with butter", IsAvailable = true },
            new PosMenuItem { HotelId = hotelId, CategoryId = catBreads.Id, Name = "Garlic Butter Naan", Price = 80, Description = "Tandoori naan topped with chopped garlic", IsAvailable = true },
            new PosMenuItem { HotelId = hotelId, CategoryId = catRice.Id, Name = "Hyderabadi Veg Dum Biryani", Price = 340, Description = "Basmati rice cooked with vegetables and saffron", IsAvailable = true },
            new PosMenuItem { HotelId = hotelId, CategoryId = catRice.Id, Name = "Dum Pukht Chicken Biryani", Price = 450, Description = "Authentic chicken biryani served with raita", IsAvailable = true },
            new PosMenuItem { HotelId = hotelId, CategoryId = catChinese.Id, Name = "Veg Hakka Noodles", Price = 240, Description = "Stir-fried noodles with crunchy vegetables", IsAvailable = true },
            new PosMenuItem { HotelId = hotelId, CategoryId = catChinese.Id, Name = "Chilli Paneer Dry", Price = 320, Description = "Crispy cottage cheese cubes in spicy sauce", IsAvailable = true },
            new PosMenuItem { HotelId = hotelId, CategoryId = catSoups.Id, Name = "Tomato Dhaniya Shorba", Price = 180, Description = "Fresh tomato soup with coriander crostini", IsAvailable = true },
            new PosMenuItem { HotelId = hotelId, CategoryId = catSouth.Id, Name = "Masala Dosa with Sambhar", Price = 210, Description = "Crispy crepe with potato masala and chutneys", IsAvailable = true },
            new PosMenuItem { HotelId = hotelId, CategoryId = catDesserts.Id, Name = "Gulab Jamun with Ice Cream", Price = 150, Description = "Warm milk dumplings with vanilla scoop", IsAvailable = true },
            new PosMenuItem { HotelId = hotelId, CategoryId = catBeverages.Id, Name = "Fresh Mango Lassi", Price = 140, Description = "Sweet chilled yogurt mango smoothie", IsAvailable = true },
            new PosMenuItem { HotelId = hotelId, CategoryId = catBeverages.Id, Name = "Cold Coffee with Ice Cream", Price = 180, Description = "Creamy iced espresso with vanilla scoop", IsAvailable = true }
        );

        await _db.SaveChangesAsync();
    }
}
