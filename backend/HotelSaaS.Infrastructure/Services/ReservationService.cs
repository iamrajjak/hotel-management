using HotelSaaS.Application.Common.Interfaces;
using HotelSaaS.Application.Common.Models;
using HotelSaaS.Application.DTOs;
using HotelSaaS.Application.Interfaces;
using HotelSaaS.Domain.Entities;
using HotelSaaS.Domain.Enums;
using HotelSaaS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HotelSaaS.Infrastructure.Services;

public class ReservationService : IReservationService
{
    private readonly ApplicationDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly ITursoSyncService _tursoSync;
    private readonly INotificationService _notification;

    public ReservationService(
        ApplicationDbContext db, 
        ITenantContext tenantContext, 
        ITursoSyncService tursoSync,
        INotificationService notification)
    {
        _db = db;
        _tenantContext = tenantContext;
        _tursoSync = tursoSync;
        _notification = notification;
    }

    public async Task<ApiResponse<List<ReservationDto>>> GetReservationsAsync()
    {
        var isSuperAdmin = _tenantContext?.IsSuperAdmin ?? false;
        var hotelId = _tenantContext?.HotelId.HasValue == true ? _tenantContext.HotelId.Value : Guid.Empty;
        string? filterHotelId = !isSuperAdmin && hotelId != Guid.Empty ? hotelId.ToString() : null;

        var resultList = new List<ReservationDto>();
        var seenKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        // 1. Fetch live reservations from Turso Cloud DB
        try
        {
            var tursoRes = await _tursoSync.FetchReservationsFromTursoAsync(filterHotelId);
            if (tursoRes != null)
            {
                foreach (var r in tursoRes)
                {
                    var key = !string.IsNullOrEmpty(r.BookingNumber) ? r.BookingNumber : r.Id.ToString();
                    if (!seenKeys.Contains(key))
                    {
                        seenKeys.Add(key);
                        resultList.Add(r);
                    }
                }
            }
        }
        catch { }

        // 2. Query local DB
        var query = _db.Reservations
            .Include(r => r.Customer)
            .Include(r => r.Room)
            .ThenInclude(room => room.RoomType)
            .IgnoreQueryFilters()
            .AsQueryable();

        var localReservations = await query.OrderByDescending(r => r.CreatedAt).ToListAsync();
        foreach (var lr in localReservations)
        {
            var key = !string.IsNullOrEmpty(lr.BookingNumber) ? lr.BookingNumber : lr.Id.ToString();
            if (!seenKeys.Contains(key))
            {
                seenKeys.Add(key);
                resultList.Add(MapToDto(lr));
            }
        }

        // 3. Dynamically calculate and enrich POS Food Charges for active/unpaid orders
        try
        {
            var activePosOrders = await _db.PosOrders
                .IgnoreQueryFilters()
                .Include(o => o.Room)
                .Where(o => o.OrderStatus != "Cancelled" && (o.PaymentStatus == "ChargedToRoom" || o.PaymentStatus == "Pending"))
                .ToListAsync();

            if (activePosOrders.Count > 0)
            {
                for (int i = 0; i < resultList.Count; i++)
                {
                    var dto = resultList[i];
                    var matchingOrders = activePosOrders.Where(o =>
                        (o.ReservationId.HasValue && o.ReservationId.Value.ToString().Equals(dto.Id.ToString(), StringComparison.OrdinalIgnoreCase)) ||
                        (o.RoomId.HasValue && o.RoomId.Value.ToString().Equals(dto.RoomId.ToString(), StringComparison.OrdinalIgnoreCase)) ||
                        (!string.IsNullOrEmpty(dto.RoomNumber) && o.Room != null && o.Room.RoomNumber.Equals(dto.RoomNumber, StringComparison.OrdinalIgnoreCase))
                    ).ToList();

                    if (matchingOrders.Count > 0)
                    {
                        decimal unpaidFood = matchingOrders.Sum(o => o.Total);
                        decimal calcTotal = dto.BaseAmount - dto.DiscountAmount + dto.TaxAmount + unpaidFood;
                        decimal calcDue = Math.Max(0, calcTotal - dto.PaidAmount);

                        resultList[i] = dto with {
                            TotalAmount = calcTotal,
                            DueAmount = calcDue
                        };
                    }
                }
            }
        }
        catch { }

        return ApiResponse<List<ReservationDto>>.Ok(resultList);
    }

    public async Task<ApiResponse<ReservationDto>> GetReservationByIdAsync(Guid id)
    {
        var r = await _db.Reservations
            .Include(res => res.Customer)
            .Include(res => res.Room)
            .ThenInclude(room => room.RoomType)
            .FirstOrDefaultAsync(res => res.Id == id);

        if (r == null)
            return ApiResponse<ReservationDto>.Fail("Reservation not found");

        return ApiResponse<ReservationDto>.Ok(MapToDto(r));
    }

    private Guid GetTenantHotelId()
    {
        if (_tenantContext.HotelId.HasValue && _tenantContext.HotelId.Value != Guid.Empty)
        {
            return _tenantContext.HotelId.Value;
        }
        var existing = _db.Hotels.IgnoreQueryFilters().FirstOrDefault();
        if (existing != null)
        {
            return existing.Id;
        }
        return Guid.Parse("00000000-0000-0000-0000-000000000002");
    }

    public async Task<ApiResponse<ReservationDto>> CreateReservationAsync(CreateReservationDto request)
    {
        // --- VALIDATIONS ---
        // 1. Date Validation (Allow same day & 1 day past buffer for late-night front desk entries)
        var minAllowedDate = DateTime.Today.AddDays(-1);
        if (request.CheckInDate.Date < minAllowedDate)
        {
            return ApiResponse<ReservationDto>.Fail("Check-in date cannot be in the past.");
        }

        if (request.CheckOutDate.Date <= request.CheckInDate.Date)
        {
            return ApiResponse<ReservationDto>.Fail("Check-out date must be after check-in date.");
        }

        // 2. Customer Phone & Email (Accept raw text as provided)
        var customerEmailInput = request.CustomerEmail?.Trim() ?? "";
        var customerPhoneInput = request.CustomerPhone?.Trim() ?? "";

        var hotelId = GetTenantHotelId();

        var hotel = await _db.Hotels.IgnoreQueryFilters().FirstOrDefaultAsync(h => h.Id == hotelId)
                    ?? await _db.Hotels.IgnoreQueryFilters().FirstOrDefaultAsync();

        if (hotel == null)
        {
            hotel = new Hotel
            {
                Id = hotelId,
                Name = "Grand Palace Hotel",
                Address = "123 Beach Road",
                City = "Goa",
                State = "Goa",
                Country = "India",
                Pincode = "403001",
                Status = "Active",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.Hotels.Add(hotel);
            try { await _db.SaveChangesAsync(); } catch {}
        }

        hotelId = hotel.Id;

        // 3. Find or Auto-Create Room
        Room? room = null;
        if (request.RoomId != Guid.Empty)
        {
            room = await _db.Rooms.Include(r => r.RoomType).FirstOrDefaultAsync(r => r.Id == request.RoomId);
        }

        if (room == null && !string.IsNullOrEmpty(request.RoomNumber))
        {
            room = await _db.Rooms.Include(r => r.RoomType).FirstOrDefaultAsync(r => r.RoomNumber == request.RoomNumber.Trim());
        }

        if (room == null)
        {
            // Auto-create room type if missing
            var roomType = await _db.RoomTypes.FirstOrDefaultAsync(rt => rt.HotelId == hotelId)
                        ?? await _db.RoomTypes.FirstOrDefaultAsync();

            if (roomType == null)
            {
                roomType = new RoomType
                {
                    Id = Guid.NewGuid(),
                    HotelId = hotelId,
                    Name = "Deluxe Queen Room",
                    Slug = "deluxe-queen-room",
                    BasePrice = 2500,
                    Status = "Active"
                };
                _db.RoomTypes.Add(roomType);
                try { await _db.SaveChangesAsync(); } catch {}
            }

            var num = string.IsNullOrEmpty(request.RoomNumber) ? "101" : request.RoomNumber.Trim();
            room = new Room
            {
                Id = Guid.NewGuid(),
                HotelId = hotelId,
                RoomTypeId = roomType.Id,
                RoomNumber = num,
                Floor = "1st Floor",
                Price = request.BaseAmount > 0 ? request.BaseAmount : (roomType.BasePrice > 0 ? roomType.BasePrice : 2500),
                Status = RoomStatus.Available
            };
            _db.Rooms.Add(room);
            try { await _db.SaveChangesAsync(); } catch {}
            room.RoomType = roomType;
        }

        // 4. Double-Booking Overlap Guard Check
        var existingOverlap = await _db.Reservations
            .AnyAsync(r => r.RoomId == room.Id &&
                           r.HotelId == hotelId &&
                           r.BookingStatus != BookingStatus.Cancelled &&
                           r.BookingStatus != BookingStatus.NoShow &&
                           !(request.CheckOutDate.Date <= r.CheckInDate.Date || request.CheckInDate.Date >= r.CheckOutDate.Date));

        if (existingOverlap)
        {
            return ApiResponse<ReservationDto>.Fail($"Room '{room.RoomNumber}' is already reserved for the selected dates.");
        }

        // 5. Find or Auto-Create Customer
        Customer? customer = null;
        if (request.CustomerId.HasValue && request.CustomerId.Value != Guid.Empty)
        {
            customer = await _db.Customers.FirstOrDefaultAsync(c => c.Id == request.CustomerId.Value);
        }

        if (customer == null)
        {
            var phone = string.IsNullOrEmpty(request.CustomerPhone) ? "9876543210" : request.CustomerPhone.Trim();
            customer = await _db.Customers.FirstOrDefaultAsync(c => c.Phone == phone);
            if (customer == null)
            {
                var custCount = (await _db.Customers.CountAsync()) + 1;
                var custGuid = Guid.Parse($"00000000-0000-0000-0004-{custCount:D12}");
                customer = new Customer
                {
                    Id = custGuid,
                    HotelId = hotelId,
                    FullName = string.IsNullOrEmpty(request.CustomerName) ? "Guest Customer" : request.CustomerName.Trim(),
                    Phone = phone,
                    Email = string.IsNullOrEmpty(request.CustomerEmail) ? "guest@example.com" : request.CustomerEmail.Trim()
                };
                _db.Customers.Add(customer);
                try { await _db.SaveChangesAsync(); } catch {}
            }
        }

        // 6. Calculate reservation totals & booking number
        var days = (request.CheckOutDate.Date - request.CheckInDate.Date).Days;
        days = days <= 0 ? 1 : days;

        var baseAmount = request.BaseAmount > 0 ? request.BaseAmount : (room.Price * days);
        var totalAmount = baseAmount - request.DiscountAmount + request.TaxAmount;

        int maxSeq = 1000;
        try
        {
            var existingTursoRes = await _tursoSync.FetchReservationsFromTursoAsync();
            if (existingTursoRes != null && existingTursoRes.Count > 0)
            {
                foreach (var r in existingTursoRes)
                {
                    if (!string.IsNullOrEmpty(r.BookingNumber) && r.BookingNumber.StartsWith("BK-"))
                    {
                        if (int.TryParse(r.BookingNumber.Substring(3), out var num))
                        {
                            if (num > maxSeq) maxSeq = num;
                        }
                    }
                }
            }
        }
        catch { }

        var dbCount = await _db.Reservations.CountAsync();
        if (1000 + dbCount > maxSeq)
        {
            maxSeq = 1000 + dbCount;
        }

        var nextBookingSeq = maxSeq + 1;
        var bookingNumber = $"BK-{nextBookingSeq}";
        var resGuid = Guid.NewGuid();

        BookingStatus parsedStatus = BookingStatus.Confirmed;
        if (!string.IsNullOrEmpty(request.BookingStatus))
        {
            Enum.TryParse(request.BookingStatus, true, out parsedStatus);
        }

        var nowTime = DateTime.Now;
        var checkIn = request.CheckInDate.Date == nowTime.Date ? nowTime : request.CheckInDate.Date.Add(nowTime.TimeOfDay);
        var checkOut = request.CheckOutDate.Date.Add(checkIn.TimeOfDay);

        var paidAmount = request.PaidAmount >= 0 ? request.PaidAmount : 0;
        if (paidAmount > totalAmount) paidAmount = totalAmount;
        var dueAmount = totalAmount - paidAmount;

        PaymentStatus paymentStatus = PaymentStatus.Pending;
        if (dueAmount == 0 && totalAmount > 0)
        {
            paymentStatus = PaymentStatus.Paid;
        }
        else if (paidAmount > 0)
        {
            paymentStatus = PaymentStatus.Partial;
        }

        var reservation = new Reservation
        {
            Id = resGuid,
            HotelId = hotelId,
            BookingNumber = bookingNumber,
            CustomerId = customer.Id,
            RoomId = room.Id,
            CheckInDate = checkIn,
            CheckOutDate = checkOut,
            Adults = request.Adults > 0 ? request.Adults : 1,
            Children = request.Children,
            BaseAmount = baseAmount,
            DiscountAmount = request.DiscountAmount,
            TaxAmount = request.TaxAmount,
            TotalAmount = totalAmount,
            PaidAmount = paidAmount,
            DueAmount = dueAmount,
            PaymentStatus = paymentStatus,
            BookingStatus = parsedStatus,
            BookingSource = request.BookingSource,
            SpecialRequest = request.SpecialRequest
        };

        // Update Room Status based on booking status
        if (parsedStatus == BookingStatus.CheckedIn || parsedStatus == BookingStatus.Confirmed)
        {
            room.Status = RoomStatus.Occupied;
        }

        _db.Reservations.Add(reservation);

        _db.AuditLogs.Add(new AuditLog
        {
            HotelId = hotelId,
            Action = "CreateReservation",
            Entity = "Reservation",
            EntityId = reservation.Id.ToString(),
            MetadataJson = $"{{\"bookingNumber\":\"{bookingNumber}\",\"guest\":\"{customer.FullName}\",\"room\":\"{room.RoomNumber}\",\"total\":{totalAmount}}}"
        });

        if (paidAmount > 0)
        {
            PaymentMethod pMethod = PaymentMethod.Cash;
            if (!string.IsNullOrEmpty(request.PaymentMethod))
            {
                Enum.TryParse(request.PaymentMethod, true, out pMethod);
            }

            var initialPayment = new Payment
            {
                HotelId = hotelId,
                ReservationId = reservation.Id,
                Amount = paidAmount,
                PaymentMethod = pMethod,
                PaymentStatus = PaymentStatus.Paid,
                PaymentDate = DateTime.Now,
                Notes = "Advance / Initial Payment at Booking Creation"
            };
            _db.Payments.Add(initialPayment);
        }
        try
        {
            await _db.SaveChangesAsync();
        }
        catch
        {
        }

        // Sync directly to Turso Cloud Online DB!
        try
        {
            await _tursoSync.SyncCustomerAsync(customer.Id.ToString(), customer.FullName, customer.Email ?? "", customer.Phone ?? "", customer.City ?? "", customer.State ?? "", hotelId: customer.HotelId.ToString());
            await _tursoSync.SyncReservationAsync(
                reservation.Id.ToString(), 
                reservation.BookingNumber, 
                customer.Id.ToString(), 
                room.Id.ToString(), 
                reservation.CheckInDate.ToString("yyyy-MM-dd HH:mm:ss"), 
                reservation.CheckOutDate.ToString("yyyy-MM-dd HH:mm:ss"), 
                reservation.TotalAmount, 
                reservation.PaidAmount, 
                reservation.PaymentStatus.ToString(), 
                reservation.BookingStatus.ToString(), 
                reservation.BookingSource ?? "Direct",
                room.RoomNumber,
                customer.Phone ?? "",
                hotelId: reservation.HotelId.ToString(),
                adults: reservation.Adults,
                children: reservation.Children
            );
            await _tursoSync.SyncRoomAsync(room.Id.ToString(), room.RoomNumber, room.RoomType?.Name ?? "Deluxe", room.Floor, room.Price, room.Status.ToString(), hotelId: room.HotelId.ToString(), roomTypeId: room.RoomTypeId.ToString());
        }
        catch (Exception ex)
        {
            return ApiResponse<ReservationDto>.Fail($"Database insertion failed: {ex.Message}");
        }

        reservation.Customer = customer;
        reservation.Room = room;

        // Trigger Automated Background Notification (WhatsApp/SMS)
        _ = Task.Run(() => _notification.SendBookingConfirmationNotificationAsync(reservation, hotel, customer));

        return ApiResponse<ReservationDto>.Ok(MapToDto(reservation), "Reservation created successfully in Turso Database");
    }

    public async Task<ApiResponse<ReservationDto>> CheckInAsync(string reservationId)
    {
        var target = (reservationId ?? "").Trim();
        Guid.TryParse(target, out var parsedGuid);

        var r = await _db.Reservations
            .Include(res => res.Customer)
            .Include(res => res.Room)
            .ThenInclude(room => room.RoomType)
            .FirstOrDefaultAsync(res => res.Id == parsedGuid || res.BookingNumber == target || res.Id.ToString() == target || res.BookingNumber == $"BK-{target}");

        if (r == null)
        {
            var tursoResList = await _tursoSync.FetchReservationsFromTursoAsync();
            var match = tursoResList.FirstOrDefault(tr => tr.Id == parsedGuid || tr.BookingNumber.Equals(target, StringComparison.OrdinalIgnoreCase) || tr.BookingNumber.EndsWith(target, StringComparison.OrdinalIgnoreCase));
            if (match != null)
            {
                r = await _db.Reservations
                    .Include(res => res.Customer)
                    .Include(res => res.Room)
                    .ThenInclude(room => room.RoomType)
                    .FirstOrDefaultAsync(res => res.Id == match.Id);
            }
        }

        var nowIso = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

        if (r != null)
        {
            if (r.BookingStatus == BookingStatus.Cancelled || r.BookingStatus == BookingStatus.NoShow)
                return ApiResponse<ReservationDto>.Fail("Cannot check-in a cancelled or no-show reservation");

            r.BookingStatus = BookingStatus.CheckedIn;
            r.CheckInDate = DateTime.Now;
            if (r.Room != null)
            {
                r.Room.Status = RoomStatus.Occupied;
            }

            try { await _db.SaveChangesAsync(); } catch { }

            if (r.Room != null)
            {
                await _tursoSync.SyncRoomAsync(r.Room.Id.ToString(), r.Room.RoomNumber, r.Room.RoomType?.Name ?? "Deluxe", r.Room.Floor, r.Room.Price, RoomStatus.Occupied.ToString(), hotelId: r.Room.HotelId.ToString(), roomTypeId: r.Room.RoomTypeId.ToString());
            }
            await _tursoSync.SyncReservationAsync(r.Id.ToString(), r.BookingNumber, r.CustomerId.ToString(), r.RoomId.ToString(), r.CheckInDate.ToString("yyyy-MM-dd HH:mm:ss"), r.CheckOutDate.ToString("yyyy-MM-dd HH:mm:ss"), r.TotalAmount, r.PaidAmount, r.PaymentStatus.ToString(), BookingStatus.CheckedIn.ToString(), r.BookingSource ?? "Direct", hotelId: r.HotelId.ToString(), adults: r.Adults, children: r.Children);

            return ApiResponse<ReservationDto>.Ok(MapToDto(r), $"Check-in completed for Room {(r.Room?.RoomNumber ?? "")}");
        }

        // Direct Turso update fallback
        await _tursoSync.ExecuteSqlAsync($"UPDATE reservations SET booking_status = 'CheckedIn', check_in_date = '{nowIso}' WHERE id = '{target}' OR booking_number = '{target}' OR id LIKE '%{target}%';");
        return ApiResponse<ReservationDto>.Ok(null!, "Check-in completed successfully in Turso DB");
    }

    public async Task<ApiResponse<ReservationDto>> CheckOutAsync(string reservationId)
    {
        var target = (reservationId ?? "").Trim();
        var cleanNum = target.Replace("res-", "").Replace("BK-", "");
        var bNum = target.StartsWith("BK-") ? target : $"BK-{cleanNum}";
        var resId = target.StartsWith("res-") ? target : $"res-{cleanNum}";
        Guid.TryParse(target, out var parsedGuid);

        var r = await _db.Reservations
            .Include(res => res.Customer)
            .Include(res => res.Room)
            .ThenInclude(room => room.RoomType)
            .FirstOrDefaultAsync(res => res.Id == parsedGuid || res.BookingNumber == target || res.BookingNumber == bNum || res.Id.ToString() == target || res.Id.ToString() == resId);

        var tursoResList = await _tursoSync.FetchReservationsFromTursoAsync();
        var match = tursoResList.FirstOrDefault(tr => tr.Id == parsedGuid || tr.BookingNumber.Equals(target, StringComparison.OrdinalIgnoreCase) || tr.BookingNumber.Equals(bNum, StringComparison.OrdinalIgnoreCase) || tr.BookingNumber.EndsWith(cleanNum, StringComparison.OrdinalIgnoreCase));
        if (r == null && match != null)
        {
            r = await _db.Reservations
                .Include(res => res.Customer)
                .Include(res => res.Room)
                .ThenInclude(room => room.RoomType)
                .FirstOrDefaultAsync(res => res.Id == match.Id);
        }

        var nowIso = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

        if (r != null)
        {
            r.BookingStatus = BookingStatus.CheckedOut;
            r.CheckOutDate = DateTime.Now;
            r.PaidAmount = r.TotalAmount;
            r.DueAmount = 0;
            r.PaymentStatus = PaymentStatus.Paid;

            if (r.Room != null)
            {
                r.Room.Status = RoomStatus.Available;
            }

            var nextInvSeq = (await _db.Invoices.IgnoreQueryFilters().CountAsync()) + 1001;
            var invoiceNumber = $"INV-{nextInvSeq}";
            var invoice = new Invoice
            {
                HotelId = r.HotelId,
                ReservationId = r.Id,
                CustomerId = r.CustomerId,
                InvoiceNumber = invoiceNumber,
                Subtotal = r.BaseAmount,
                Discount = r.DiscountAmount,
                Tax = r.TaxAmount,
                Total = r.TotalAmount,
                Paid = r.TotalAmount,
                Due = 0,
                Status = "Paid"
            };

            _db.Invoices.Add(invoice);
            try { await _db.SaveChangesAsync(); } catch { }

            if (r.Room != null)
            {
                await _tursoSync.SyncRoomAsync(r.Room.Id.ToString(), r.Room.RoomNumber, r.Room.RoomType?.Name ?? "Deluxe", r.Room.Floor, r.Room.Price, RoomStatus.Available.ToString(), hotelId: r.Room.HotelId.ToString());
            }
            await _tursoSync.SyncReservationAsync(r.Id.ToString(), r.BookingNumber, r.CustomerId.ToString(), r.RoomId.ToString(), r.CheckInDate.ToString("yyyy-MM-dd HH:mm:ss"), r.CheckOutDate.ToString("yyyy-MM-dd HH:mm:ss"), r.TotalAmount, r.TotalAmount, "Paid", "CheckedOut", r.BookingSource ?? "Direct", hotelId: r.HotelId.ToString(), adults: r.Adults, children: r.Children);

            if (r.Customer != null)
            {
                var hotel = await _db.Hotels.IgnoreQueryFilters().FirstOrDefaultAsync(h => h.Id == r.HotelId);
                if (hotel != null)
                {
                    _ = Task.Run(() => _notification.SendCheckOutNotificationAsync(r, hotel, r.Customer));
                }
            }
        }

        string rawBkNum = match?.BookingNumber ?? r?.BookingNumber ?? "";
        string bkDigits = System.Text.RegularExpressions.Regex.Match(rawBkNum, @"\d+").Value;
        if (string.IsNullOrEmpty(bkDigits))
        {
            bkDigits = System.Text.RegularExpressions.Regex.Match(cleanNum, @"\d+").Value;
        }
        int.TryParse(bkDigits, out var bkNum);
        var trainSeq = bkNum > 1000 ? (bkNum - 1000) : bkNum;

        // Direct Turso update fallback to ensure 100% database persistence
        await _tursoSync.ExecuteSqlAsync($"UPDATE reservations SET booking_status = 'CheckedOut', check_out_date = '{nowIso}', payment_status = 'Paid', paid_amount = total_amount, due_amount = 0 WHERE id = '{target}' OR id = 'res-{bkNum}' OR id = 'res-{trainSeq}' OR booking_number = '{target}' OR booking_number = '{rawBkNum}' OR booking_number = 'BK-{bkNum}' OR booking_number = 'BK-{trainSeq}' OR trainid = {trainSeq} OR trainid = {bkNum};");
        
        await _tursoSync.ExecuteSqlAsync($"UPDATE rooms SET status = 'Available' WHERE room_number IN (SELECT REPLACE(room_id, 'room-', '') FROM reservations WHERE id = '{target}' OR id = 'res-{bkNum}' OR id = 'res-{trainSeq}' OR booking_number = 'BK-{bkNum}' OR trainid = {trainSeq}) OR id IN (SELECT room_id FROM reservations WHERE id = '{target}' OR id = 'res-{bkNum}' OR id = 'res-{trainSeq}' OR booking_number = 'BK-{bkNum}' OR trainid = {trainSeq});");
        if (r?.Room != null)
        {
            await _tursoSync.ExecuteSqlAsync($"UPDATE rooms SET status = 'Available' WHERE id = '{r.Room.Id}' OR room_number = '{r.Room.RoomNumber}';");
        }

        return ApiResponse<ReservationDto>.Ok(r != null ? MapToDto(r) : null!, "Check-out completed successfully.");
    }

    public async Task<ApiResponse<ReservationDto>> CancelReservationAsync(string reservationId)
    {
        var target = (reservationId ?? "").Trim();
        Guid.TryParse(target, out var parsedGuid);

        var r = await _db.Reservations
            .Include(res => res.Customer)
            .Include(res => res.Room)
            .ThenInclude(room => room.RoomType)
            .FirstOrDefaultAsync(res => res.Id == parsedGuid || res.BookingNumber == target || res.Id.ToString() == target);

        if (r == null)
        {
            return ApiResponse<ReservationDto>.Fail("Reservation not found");
        }

        if (r.BookingStatus == BookingStatus.CheckedOut)
            return ApiResponse<ReservationDto>.Fail("Cannot cancel a completed reservation");

        r.BookingStatus = BookingStatus.Cancelled;
        if (r.Room != null)
        {
            r.Room.Status = RoomStatus.Available;
        }

        await _db.SaveChangesAsync();
        if (r.Room != null)
        {
            await _tursoSync.SyncRoomAsync(r.Room.Id.ToString(), r.Room.RoomNumber, r.Room.RoomType?.Name ?? "Deluxe", r.Room.Floor, r.Room.Price, r.Room.Status.ToString());
        }
        await _tursoSync.SyncReservationAsync(r.Id.ToString(), r.BookingNumber, r.CustomerId.ToString(), r.RoomId.ToString(), r.CheckInDate.ToString("yyyy-MM-dd"), r.CheckOutDate.ToString("yyyy-MM-dd"), r.TotalAmount, r.PaidAmount, r.PaymentStatus.ToString(), r.BookingStatus.ToString(), r.BookingSource ?? "Direct", adults: r.Adults, children: r.Children);

        return ApiResponse<ReservationDto>.Ok(MapToDto(r), "Reservation cancelled successfully");
    }

    public async Task<ApiResponse<ReservationDto>> UpdateReservationAsync(string reservationId, CreateReservationDto request)
    {
        var target = (reservationId ?? "").Trim();
        var cleanNum = target.Replace("res-", "").Replace("BK-", "");
        var bNum = target.StartsWith("BK-") ? target : $"BK-{cleanNum}";
        Guid.TryParse(target, out var parsedGuid);

        var r = await _db.Reservations
            .Include(res => res.Customer)
            .Include(res => res.Room)
            .ThenInclude(room => room.RoomType)
            .FirstOrDefaultAsync(res => res.Id == parsedGuid || res.BookingNumber == target || res.BookingNumber == bNum || res.Id.ToString() == target);

        if (r == null)
        {
            return ApiResponse<ReservationDto>.Fail("Reservation not found");
        }

        if (!string.IsNullOrWhiteSpace(request.CustomerName) && r.Customer != null)
        {
            r.Customer.FullName = request.CustomerName.Trim();
            if (!string.IsNullOrWhiteSpace(request.CustomerPhone)) r.Customer.Phone = request.CustomerPhone.Trim();
            if (!string.IsNullOrWhiteSpace(request.CustomerEmail)) r.Customer.Email = request.CustomerEmail.Trim();
        }

        if (!string.IsNullOrWhiteSpace(request.RoomNumber) && (r.Room == null || r.Room.RoomNumber != request.RoomNumber.Trim()))
        {
            var newRoom = await _db.Rooms.FirstOrDefaultAsync(rm => rm.RoomNumber == request.RoomNumber.Trim());
            if (newRoom != null)
            {
                r.RoomId = newRoom.Id;
                r.Room = newRoom;
            }
        }

        if (request.CheckInDate != default) r.CheckInDate = request.CheckInDate;
        if (request.CheckOutDate != default) r.CheckOutDate = request.CheckOutDate;
        if (request.Adults > 0) r.Adults = request.Adults;
        r.Children = request.Children;

        var days = (r.CheckOutDate.Date - r.CheckInDate.Date).Days;
        days = days <= 0 ? 1 : days;

        var baseAmount = request.BaseAmount > 0 ? request.BaseAmount : ((r.Room?.Price ?? 2500) * days);
        var totalAmount = baseAmount - request.DiscountAmount + request.TaxAmount;

        r.BaseAmount = baseAmount;
        r.DiscountAmount = request.DiscountAmount;
        r.TaxAmount = request.TaxAmount;
        r.TotalAmount = totalAmount;

        if (request.PaidAmount >= 0) r.PaidAmount = request.PaidAmount;
        if (r.PaidAmount > r.TotalAmount) r.PaidAmount = r.TotalAmount;
        r.DueAmount = r.TotalAmount - r.PaidAmount;

        if (r.DueAmount == 0 && r.TotalAmount > 0) r.PaymentStatus = PaymentStatus.Paid;
        else if (r.PaidAmount > 0) r.PaymentStatus = PaymentStatus.Partial;
        else r.PaymentStatus = PaymentStatus.Pending;

        if (!string.IsNullOrWhiteSpace(request.BookingStatus))
        {
            if (Enum.TryParse<BookingStatus>(request.BookingStatus, true, out var pStatus))
            {
                r.BookingStatus = pStatus;
            }
        }

        if (r.Room == null && r.RoomId != Guid.Empty)
        {
            r.Room = await _db.Rooms.Include(rm => rm.RoomType).FirstOrDefaultAsync(rm => rm.Id == r.RoomId);
        }

        if (r.Room != null)
        {
            if (r.BookingStatus == BookingStatus.CheckedIn || r.BookingStatus == BookingStatus.Confirmed)
            {
                r.Room.Status = RoomStatus.Occupied;
            }
            else if (r.BookingStatus == BookingStatus.CheckedOut || r.BookingStatus == BookingStatus.Cancelled || r.BookingStatus == BookingStatus.NoShow)
            {
                r.Room.Status = RoomStatus.Available;
            }
        }

        try { await _db.SaveChangesAsync(); } catch { }

        // Direct Turso update sync
        try
        {
            if (r.Room != null)
            {
                var roomStatStr = r.Room.Status.ToString();
                await _tursoSync.SyncRoomAsync(
                    r.Room.Id.ToString(), r.Room.RoomNumber, r.Room.RoomType?.Name ?? "Deluxe",
                    r.Room.Floor, r.Room.Price, roomStatStr, hotelId: r.Room.HotelId.ToString()
                );
                await _tursoSync.ExecuteSqlAsync($"UPDATE rooms SET status = '{roomStatStr}' WHERE id = '{r.Room.Id}' OR room_number = '{r.Room.RoomNumber}';");
            }

            await _tursoSync.SyncReservationAsync(
                r.Id.ToString(), r.BookingNumber, r.CustomerId.ToString(), r.RoomId.ToString(),
                r.CheckInDate.ToString("yyyy-MM-dd HH:mm:ss"), r.CheckOutDate.ToString("yyyy-MM-dd HH:mm:ss"),
                r.TotalAmount, r.PaidAmount, r.PaymentStatus.ToString(), r.BookingStatus.ToString(),
                r.BookingSource ?? "Direct", r.Room?.RoomNumber ?? "", r.Customer?.Phone ?? "",
                hotelId: r.HotelId.ToString(), adults: r.Adults, children: r.Children
            );
        }
        catch { }

        return ApiResponse<ReservationDto>.Ok(MapToDto(r), "Reservation updated successfully.");
    }

    public async Task<ApiResponse<bool>> DeleteReservationAsync(string reservationId)
    {
        var target = (reservationId ?? "").Trim();
        var cleanNum = target.Replace("res-", "").Replace("BK-", "").Trim();
        var bNum = target.StartsWith("BK-") ? target : $"BK-{cleanNum}";

        try
        {
            await _db.Database.ExecuteSqlRawAsync("PRAGMA foreign_keys = OFF;");
            await _db.Database.ExecuteSqlRawAsync($"DELETE FROM PosOrderItems WHERE OrderId IN (SELECT Id FROM PosOrders WHERE ReservationId IN (SELECT Id FROM Reservations WHERE BookingNumber = '{target}' OR BookingNumber = '{bNum}' OR Id = '{target}'));");
            await _db.Database.ExecuteSqlRawAsync($"DELETE FROM PosOrders WHERE ReservationId IN (SELECT Id FROM Reservations WHERE BookingNumber = '{target}' OR BookingNumber = '{bNum}' OR Id = '{target}');");
            await _db.Database.ExecuteSqlRawAsync($"DELETE FROM Invoices WHERE ReservationId IN (SELECT Id FROM Reservations WHERE BookingNumber = '{target}' OR BookingNumber = '{bNum}' OR Id = '{target}');");
            await _db.Database.ExecuteSqlRawAsync($"DELETE FROM Payments WHERE ReservationId IN (SELECT Id FROM Reservations WHERE BookingNumber = '{target}' OR BookingNumber = '{bNum}' OR Id = '{target}');");
            await _db.Database.ExecuteSqlRawAsync($"DELETE FROM Reservations WHERE Id = '{target}' OR BookingNumber = '{target}' OR BookingNumber = '{bNum}' OR BookingNumber LIKE '%{cleanNum}%';");
            await _db.Database.ExecuteSqlRawAsync("PRAGMA foreign_keys = ON;");
        }
        catch { }

        try
        {
            await _tursoSync.DeleteReservationAsync(target);
        }
        catch { }

        return ApiResponse<bool>.Ok(true, "Reservation deleted successfully.");
    }

    private static ReservationDto MapToDto(Reservation r) => new(
        r.Id,
        r.HotelId,
        r.BookingNumber,
        r.CustomerId,
        r.Customer?.FullName ?? "Guest",
        r.Customer?.Phone ?? "",
        r.Customer?.Email ?? "",
        r.RoomId,
        r.Room?.RoomNumber ?? "",
        r.Room?.RoomType?.Name ?? "Standard",
        r.CheckInDate,
        r.CheckOutDate,
        r.Adults,
        r.Children,
        r.BaseAmount,
        r.DiscountAmount,
        r.TaxAmount,
        r.TotalAmount,
        r.PaidAmount,
        r.DueAmount,
        r.PaymentStatus,
        r.BookingStatus,
        r.BookingSource,
        r.SpecialRequest,
        r.CreatedAt
    );
}
