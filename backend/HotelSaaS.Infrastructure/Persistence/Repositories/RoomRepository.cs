using HotelSaaS.Application.Common.Interfaces;
using HotelSaaS.Domain.Entities;
using HotelSaaS.Domain.Enums;
using HotelSaaS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HotelSaaS.Infrastructure.Persistence.Repositories;

public class RoomRepository : Repository<Room>, IRoomRepository
{
    public RoomRepository(ApplicationDbContext db) : base(db)
    {
    }

	public async Task<List<Room>> GetRoomsWithTypesAsync(Guid hotelId)
	{
		if (hotelId != Guid.Empty)
		{
			return await Db.Rooms
				.AsNoTracking()
				.IgnoreQueryFilters()
				.Include(r => r.RoomType)
				.Where(r => r.HotelId == hotelId)
				.OrderBy(r => r.RoomNumber)
				.ToListAsync();
		}

		return await Db.Rooms
			.AsNoTracking()
			.IgnoreQueryFilters()
			.Include(r => r.RoomType)
			.OrderBy(r => r.RoomNumber)
			.ToListAsync();
	}
	public async Task<Room?> GetRoomByNumberAsync(string roomNumber, Guid hotelId)
    {
        if (string.IsNullOrWhiteSpace(roomNumber))
            return null;

        var targetRoomNumber = roomNumber.Trim();

        if (hotelId != Guid.Empty)
        {
            return await Db.Rooms
                .IgnoreQueryFilters()
                .Include(r => r.RoomType)
                .FirstOrDefaultAsync(r => r.HotelId == hotelId && r.RoomNumber.ToLower() == targetRoomNumber.ToLower());
        }

        return await Db.Rooms
            .IgnoreQueryFilters()
            .Include(r => r.RoomType)
            .FirstOrDefaultAsync(r => r.RoomNumber.ToLower() == targetRoomNumber.ToLower());
    }

    public async Task<List<RoomType>> GetRoomTypesAsync(Guid hotelId)
    {
        if (hotelId != Guid.Empty)
        {
            var hotelTypes = await Db.RoomTypes
                .AsNoTracking()
                .IgnoreQueryFilters()
                .Where(rt => rt.HotelId == hotelId)
                .ToListAsync();

            if (hotelTypes.Count > 0)
                return hotelTypes;
        }

        return await Db.RoomTypes
            .AsNoTracking()
            .IgnoreQueryFilters()
            .ToListAsync();
    }

    public async Task<RoomType?> GetRoomTypeByIdOrNameAsync(Guid roomTypeId, string? roomTypeName, Guid hotelId)
    {
        if (roomTypeId != Guid.Empty)
        {
            var foundById = await Db.RoomTypes
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(rt => (hotelId == Guid.Empty || rt.HotelId == hotelId) && rt.Id == roomTypeId);

            if (foundById != null)
                return foundById;
        }

        if (!string.IsNullOrWhiteSpace(roomTypeName))
        {
            var targetName = roomTypeName.Trim();
            var targetSlug = targetName.ToLowerInvariant().Replace(" ", "-");

            var foundByName = await Db.RoomTypes
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(rt => (hotelId == Guid.Empty || rt.HotelId == hotelId) &&
                    (rt.Slug == targetSlug || rt.Name.ToLower() == targetName.ToLower()));

            if (foundByName != null)
                return foundByName;

            return await Db.RoomTypes
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(rt => rt.Slug == targetSlug || rt.Name.ToLower() == targetName.ToLower());
        }

        return null;
    }

    public async Task AddRoomTypeAsync(RoomType roomType)
    {
        if (roomType == null)
            throw new ArgumentNullException(nameof(roomType));

        if (roomType.Id == Guid.Empty)
            roomType.Id = Guid.NewGuid();

        await Db.RoomTypes.AddAsync(roomType);
    }

    public async Task<List<Room>> GetAvailableRoomsAsync(DateTime checkIn, DateTime checkOut, int adults, Guid hotelId)
    {
        var bookedRoomIds = await Db.Reservations
            .IgnoreQueryFilters()
            .Where(r => r.BookingStatus != BookingStatus.Cancelled &&
                        r.BookingStatus != BookingStatus.NoShow &&
                        !(checkOut <= r.CheckInDate || checkIn >= r.CheckOutDate))
            .Select(r => r.RoomId)
            .ToListAsync();

        return await Db.Rooms
            .AsNoTracking()
            .IgnoreQueryFilters()
            .Include(r => r.RoomType)
            .Where(r => !bookedRoomIds.Contains(r.Id) &&
                        r.Status != RoomStatus.Maintenance &&
                        r.Status != RoomStatus.OutOfOrder &&
                        r.RoomType != null &&
                        r.RoomType.MaxAdults >= adults)
            .ToListAsync();
    }
}
