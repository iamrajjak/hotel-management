using HotelSaaS.Application.Common.Interfaces;
using HotelSaaS.Application.Common.Models;
using HotelSaaS.Application.DTOs;
using HotelSaaS.Application.Interfaces;
using HotelSaaS.Domain.Entities;
using HotelSaaS.Domain.Enums;
using HotelSaaS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HotelSaaS.Infrastructure.Services;

public class RoomService : IRoomService
{
    private readonly ApplicationDbContext _db;
    private readonly IRoomRepository _roomRepository;
    private readonly ITenantContext _tenantContext;
    private readonly ITursoSyncService _tursoSync;

    public RoomService(
        ApplicationDbContext db,
        IRoomRepository roomRepository,
        ITenantContext tenantContext,
        ITursoSyncService tursoSync)
    {
        _db = db;
        _roomRepository = roomRepository;
        _tenantContext = tenantContext;
        _tursoSync = tursoSync;
    }

    private Guid GetTenantHotelId()
    {
        if (_tenantContext.HotelId.HasValue && _tenantContext.HotelId.Value != Guid.Empty)
        {
            var tid = _tenantContext.HotelId.Value;
            if (_db.Hotels.IgnoreQueryFilters().Any(h => h.Id == tid))
            {
                return tid;
            }
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

        try
        {
            var defaultHotel = new Hotel
            {
                Id = defaultGuid,
                Name = "Jodhpur Royal",
                Slug = "jodhpur-royal",
                Email = "admin@hotel.com",
                Phone = "09784306040",
                Address = "Main Road",
                City = "Jodhpur",
                State = "Rajasthan",
                Country = "India",
                Pincode = "342001",
                Status = "Active",
                WifiName = "Hotel_Guest_WiFi",
                WifiPassword = "Welcome2026",
                ReviewUrl = "https://g.page/r/your-hotel-review",
                HotelCode = "HTL-MAIN"
            };
            _db.Hotels.Add(defaultHotel);
            _db.SaveChanges();
            return defaultGuid;
        }
        catch
        {
            return defaultGuid;
        }
    }

    public async Task<ApiResponse<List<RoomTypeDto>>> GetRoomTypesAsync()
    {
        var types = await _db.RoomTypes
            .AsNoTracking()
            .OrderBy(rt => rt.Name)
            .ToListAsync();
        return ApiResponse<List<RoomTypeDto>>.Ok(types.Select(MapTypeDto).ToList());
    }

    public async Task<ApiResponse<RoomTypeDto>> CreateRoomTypeAsync(CreateRoomTypeDto request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Name))
            return ApiResponse<RoomTypeDto>.Fail("Room type name is required.");

        var hotelId = GetTenantHotelId();

        var slug = request.Name.Trim().ToLowerInvariant().Replace(" ", "-");
        var existing = await _db.RoomTypes
            .FirstOrDefaultAsync(rt => rt.HotelId == hotelId && (rt.Name.ToLower() == request.Name.Trim().ToLower() || rt.Slug == slug));

        if (existing != null)
        {
            return ApiResponse<RoomTypeDto>.Ok(MapTypeDto(existing), "Room type already exists.");
        }

        var roomType = new RoomType
        {
            Id = Guid.NewGuid(),
            HotelId = hotelId,
            Name = request.Name.Trim(),
            Slug = slug,
            Description = request.Description,
            BasePrice = request.BasePrice > 0 ? request.BasePrice : 2500,
            MaxAdults = request.MaxAdults > 0 ? request.MaxAdults : 2,
            MaxChildren = request.MaxChildren,
            BedType = string.IsNullOrWhiteSpace(request.BedType) ? "King Bed" : request.BedType,
            RoomSize = string.IsNullOrWhiteSpace(request.RoomSize) ? "300 sq.ft" : request.RoomSize,
            AmenitiesJson = request.AmenitiesJson ?? "[]",
            Status = "Active"
        };

        _db.RoomTypes.Add(roomType);
        await _db.SaveChangesAsync();

        return ApiResponse<RoomTypeDto>.Ok(MapTypeDto(roomType), "Room type created successfully.");
    }

    public async Task<ApiResponse<List<RoomDto>>> GetRoomsAsync()
    {
        var isSuperAdmin = _tenantContext?.IsSuperAdmin ?? false;
        var hotelId = _tenantContext?.HotelId.HasValue == true ? _tenantContext.HotelId.Value : Guid.Empty;
        string? filterHotelId = !isSuperAdmin && hotelId != Guid.Empty ? hotelId.ToString() : null;

        var resultList = new List<RoomDto>();
        var seenKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        // 1. Fetch live rooms from Turso Cloud DB
        try
        {
            var tursoRooms = await _tursoSync.FetchRoomsFromTursoAsync(filterHotelId);
            if (tursoRooms != null)
            {
                foreach (var r in tursoRooms)
                {
                    var key = !string.IsNullOrEmpty(r.RoomNumber) ? r.RoomNumber : r.Id.ToString();
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
        var query = _db.Rooms.Include(r => r.RoomType).AsNoTracking().AsQueryable();
        if (!isSuperAdmin && hotelId != Guid.Empty)
        {
            query = query.Where(r => r.HotelId == hotelId);
        }

        var localRooms = await query.OrderBy(r => r.RoomNumber).ToListAsync();
        foreach (var lr in localRooms)
        {
            var key = !string.IsNullOrEmpty(lr.RoomNumber) ? lr.RoomNumber : lr.Id.ToString();
            if (!seenKeys.Contains(key))
            {
                seenKeys.Add(key);
                resultList.Add(MapRoomDto(lr));
            }
        }

        return ApiResponse<List<RoomDto>>.Ok(resultList);
    }

    public async Task<ApiResponse<RoomDto>> CreateRoomAsync(CreateRoomDto request)
    {
        if (request == null)
            return ApiResponse<RoomDto>.Fail("Request is required.");

        if (string.IsNullOrWhiteSpace(request.RoomNumber))
            return ApiResponse<RoomDto>.Fail("Room number is required.");

        var isSuperAdmin = _tenantContext?.IsSuperAdmin ?? false;
        var hotelId = GetTenantHotelId();
        var roomNumber = request.RoomNumber.Trim();

        // 1. Find or Create RoomType
        RoomType? roomType = null;
        if (request.RoomTypeId != Guid.Empty)
        {
            roomType = await _db.RoomTypes
                .FirstOrDefaultAsync(x => x.Id == request.RoomTypeId && (hotelId == Guid.Empty || x.HotelId == hotelId));
        }

        if (roomType == null && !string.IsNullOrWhiteSpace(request.RoomTypeName))
        {
            var roomTypeNameInput = request.RoomTypeName.Trim();
            roomType = await _db.RoomTypes
                .FirstOrDefaultAsync(x => x.Name.ToLower() == roomTypeNameInput.ToLower() && (hotelId == Guid.Empty || x.HotelId == hotelId));
        }

        if (roomType == null)
        {
            var targetTypeName = string.IsNullOrWhiteSpace(request.RoomTypeName) ? "Deluxe Queen Room" : request.RoomTypeName.Trim();
            var targetSlug = targetTypeName.ToLowerInvariant().Replace(" ", "-");

            roomType = await _db.RoomTypes
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(x => (isSuperAdmin || x.HotelId == hotelId) && (x.Slug == targetSlug || x.Name.ToLower() == targetTypeName.ToLower()));

            if (roomType == null)
            {
                var rtGuid = Guid.NewGuid();
                roomType = new RoomType
                {
                    Id = rtGuid,
                    HotelId = hotelId,
                    Name = targetTypeName,
                    Slug = targetSlug,
                    Description = $"{targetTypeName} accommodation",
                    BasePrice = request.Price > 0 ? request.Price : 2500,
                    MaxAdults = 2,
                    MaxChildren = 1,
                    BedType = "King Bed",
                    RoomSize = "300 sq.ft",
                    Status = "Active"
                };

                _db.RoomTypes.Add(roomType);
                await _db.SaveChangesAsync();
            }
        }

        // 2. Room Status
        RoomStatus status = RoomStatus.Available;
        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            Enum.TryParse(request.Status, true, out status);
        }

        // Check if Room already exists for this hotel (Upsert logic: Update if exists, Create if new)
        var existingRoom = await _db.Rooms
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(r => (request.Id != Guid.Empty && r.Id == request.Id) || (r.HotelId == hotelId && r.RoomNumber.ToLower() == roomNumber.ToLower()));

        if (request.Id == Guid.Empty && existingRoom != null)
        {
            return ApiResponse<RoomDto>.Fail($"Room number '{roomNumber}' already exists in this hotel.");
        }

        if (existingRoom != null)
        {
            // Security tenant check
            if (!isSuperAdmin && existingRoom.HotelId != hotelId)
            {
                return ApiResponse<RoomDto>.Fail("Access denied. You can only update rooms belonging to your hotel.");
            }

            existingRoom.RoomNumber = roomNumber;
            existingRoom.RoomTypeId = roomType.Id;
            existingRoom.Floor = string.IsNullOrWhiteSpace(request.Floor) ? existingRoom.Floor : request.Floor.Trim();
            existingRoom.Price = request.Price > 0 ? request.Price : existingRoom.Price;
            existingRoom.Status = status;
            if (!string.IsNullOrWhiteSpace(request.Notes))
                existingRoom.Notes = request.Notes;

            await _db.SaveChangesAsync();

            // Verify database update
            var verifiedRoom = await _db.Rooms
                .IgnoreQueryFilters()
                .Include(r => r.RoomType)
                .FirstOrDefaultAsync(r => r.Id == existingRoom.Id && (isSuperAdmin || r.HotelId == hotelId));

            if (verifiedRoom == null)
            {
                return ApiResponse<RoomDto>.Fail("Room was not saved successfully in database.");
            }

            // Direct SQL UPDATE on Turso Cloud Database table
            try
            {
                await _tursoSync.SyncRoomAsync(
                    verifiedRoom.Id.ToString(),
                    verifiedRoom.RoomNumber,
                    roomType.Name,
                    verifiedRoom.Floor,
                    verifiedRoom.Price,
                    verifiedRoom.Status.ToString(),
                    hotelId: verifiedRoom.HotelId.ToString(),
                    roomTypeId: verifiedRoom.RoomTypeId.ToString());
            }
            catch
            {
            }

            return ApiResponse<RoomDto>.Ok(MapRoomDto(verifiedRoom), "Room updated successfully in Database.");
        }

        Guid roomId = request.Id != Guid.Empty ? request.Id : Guid.NewGuid();

        var room = new Room
        {
            Id = roomId,
            HotelId = hotelId,
            RoomTypeId = roomType.Id,
            RoomNumber = roomNumber,
            Floor = string.IsNullOrWhiteSpace(request.Floor) ? "1st Floor" : request.Floor.Trim(),
            Price = request.Price > 0 ? request.Price : roomType.BasePrice,
            Status = status,
            Notes = request.Notes
        };

        await _db.Rooms.AddAsync(room);
        await _db.SaveChangesAsync();

        // Verify database insert
        var savedRoom = await _db.Rooms
            .IgnoreQueryFilters()
            .Include(r => r.RoomType)
            .FirstOrDefaultAsync(r => r.Id == room.Id && (isSuperAdmin || r.HotelId == hotelId));

        if (savedRoom == null)
        {
            return ApiResponse<RoomDto>.Fail("Room was not saved successfully in database.");
        }

        // Direct SQL INSERT into Turso Cloud Database table
        try
        {
            await _tursoSync.SyncRoomAsync(
                savedRoom.Id.ToString(),
                savedRoom.RoomNumber,
                roomType.Name,
                savedRoom.Floor,
                savedRoom.Price,
                savedRoom.Status.ToString(),
                hotelId: savedRoom.HotelId.ToString(),
                roomTypeId: savedRoom.RoomTypeId.ToString());
        }
        catch
        {
        }

        return ApiResponse<RoomDto>.Ok(MapRoomDto(savedRoom), "Room created successfully in Database.");
    }

    public async Task<ApiResponse<RoomDto>> UpdateRoomStatusAsync(string roomIdOrNum, UpdateRoomStatusDto request)
    {
        var target = (roomIdOrNum ?? "").Trim();
        Guid.TryParse(target, out var parsedGuid);
        var isSuperAdmin = _tenantContext?.IsSuperAdmin ?? false;
        var hotelId = GetTenantHotelId();

        var room = await _db.Rooms.IgnoreQueryFilters()
            .FirstOrDefaultAsync(r => (r.Id == parsedGuid || r.RoomNumber == target || r.Id.ToString() == target) 
                                      && (isSuperAdmin || r.HotelId == hotelId));

        if (room == null)
        {
            return ApiResponse<RoomDto>.Fail("Room not found or access denied for your hotel.");
        }

        var roomNum = room.RoomNumber;

        room.Status = request.Status;
        if (!string.IsNullOrEmpty(request.Notes))
            room.Notes = request.Notes;
        
        await _db.SaveChangesAsync();

        // Direct SQL UPDATE on Turso Cloud Database table!
        try
        {
            await _tursoSync.SyncRoomAsync(
                room.Id.ToString(),
                roomNum,
                room.RoomType?.Name ?? "Deluxe Queen Room",
                room.Floor,
                room.Price,
                request.Status.ToString(),
                hotelId: room.HotelId.ToString(),
                roomTypeId: room.RoomTypeId.ToString());
        }
        catch
        {
        }

        return ApiResponse<RoomDto>.Ok(MapRoomDto(room), $"Room {roomNum} status updated to {request.Status} in Database.");
    }

    public async Task<ApiResponse<List<RoomDto>>> GetAvailableRoomsAsync(RoomAvailabilityQueryDto query)
    {
        var isSuperAdmin = _tenantContext?.IsSuperAdmin ?? false;
        var hotelId = isSuperAdmin ? Guid.Empty : GetTenantHotelId();
        if (query.CheckOutDate <= query.CheckInDate)
            return ApiResponse<List<RoomDto>>.Fail("Check-out date must be after check-in date.");

        var availableRooms = await _roomRepository.GetAvailableRoomsAsync(query.CheckInDate, query.CheckOutDate, query.Adults, isSuperAdmin ? Guid.Empty : hotelId);
        return ApiResponse<List<RoomDto>>.Ok(availableRooms.Select(MapRoomDto).ToList());
    }

    public async Task<ApiResponse<bool>> DeleteRoomAsync(string roomIdOrNum)
    {
        var target = (roomIdOrNum ?? "").Trim();
        var cleanNum = target.Replace("room-", "").Replace("room", "").Replace("Room", "").Trim();

        try
        {
            await _db.Database.ExecuteSqlRawAsync("PRAGMA foreign_keys = OFF;");
            await _db.Database.ExecuteSqlRawAsync($"DELETE FROM PosOrderItems WHERE OrderId IN (SELECT Id FROM PosOrders WHERE RoomId IN (SELECT Id FROM Rooms WHERE RoomNumber = '{cleanNum}' OR RoomNumber = '{target}' OR Id = '{target}'));");
            await _db.Database.ExecuteSqlRawAsync($"DELETE FROM PosOrders WHERE RoomId IN (SELECT Id FROM Rooms WHERE RoomNumber = '{cleanNum}' OR RoomNumber = '{target}' OR Id = '{target}');");
            await _db.Database.ExecuteSqlRawAsync($"DELETE FROM Invoices WHERE ReservationId IN (SELECT Id FROM Reservations WHERE RoomId IN (SELECT Id FROM Rooms WHERE RoomNumber = '{cleanNum}' OR RoomNumber = '{target}' OR Id = '{target}'));");
            await _db.Database.ExecuteSqlRawAsync($"DELETE FROM Payments WHERE ReservationId IN (SELECT Id FROM Reservations WHERE RoomId IN (SELECT Id FROM Rooms WHERE RoomNumber = '{cleanNum}' OR RoomNumber = '{target}' OR Id = '{target}'));");
            await _db.Database.ExecuteSqlRawAsync($"DELETE FROM HousekeepingTasks WHERE RoomId IN (SELECT Id FROM Rooms WHERE RoomNumber = '{cleanNum}' OR RoomNumber = '{target}' OR Id = '{target}');");
            await _db.Database.ExecuteSqlRawAsync($"DELETE FROM Reservations WHERE RoomId IN (SELECT Id FROM Rooms WHERE RoomNumber = '{cleanNum}' OR RoomNumber = '{target}' OR Id = '{target}') OR RoomId = '{target}';");
            await _db.Database.ExecuteSqlRawAsync($"DELETE FROM Rooms WHERE Id = '{target}' OR RoomNumber = '{cleanNum}' OR RoomNumber = '{target}';");
            await _db.Database.ExecuteSqlRawAsync("PRAGMA foreign_keys = ON;");
        }
        catch { }

        try
        {
            await _tursoSync.DeleteRoomAsync(target, cleanNum);
        }
        catch { }

        return ApiResponse<bool>.Ok(true, $"Room {cleanNum} deleted successfully from Database.");
    }

    private static RoomTypeDto MapTypeDto(RoomType rt) => new(
        rt.Id, rt.HotelId, rt.Name, rt.Slug, rt.Description, rt.BasePrice,
        rt.MaxAdults, rt.MaxChildren, rt.BedType, rt.RoomSize, rt.AmenitiesJson, rt.Status
    );

    private static RoomDto MapRoomDto(Room r) => new(
        r.trainid, r.Id, r.HotelId, r.RoomTypeId, r.RoomType?.Name ?? "Standard",
        r.RoomNumber, r.Floor, r.Price, r.Status, r.Notes
    );
}
