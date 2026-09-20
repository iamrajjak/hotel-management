using HotelSaaS.Application.Common.Interfaces;
using HotelSaaS.Domain.Entities;
using HotelSaaS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HotelSaaS.Infrastructure.Persistence.Repositories;

public class ReservationRepository : Repository<Reservation>, IReservationRepository
{
    public ReservationRepository(ApplicationDbContext db) : base(db)
    {
    }

    public async Task<List<Reservation>> GetReservationsWithDetailsAsync()
    {
        return await Db.Reservations
            .IgnoreQueryFilters()
            .Include(r => r.Customer)
            .Include(r => r.Room)
            .ThenInclude(rm => rm.RoomType)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();
    }

    public async Task<Reservation?> GetReservationByIdWithDetailsAsync(Guid id)
    {
        return await Db.Reservations
            .IgnoreQueryFilters()
            .Include(r => r.Customer)
            .Include(r => r.Room)
            .ThenInclude(rm => rm.RoomType)
            .FirstOrDefaultAsync(r => r.Id == id);
    }

    public async Task<Reservation?> GetByBookingNumberAsync(string bookingNumber)
    {
        return await Db.Reservations
            .IgnoreQueryFilters()
            .Include(r => r.Customer)
            .Include(r => r.Room)
            .FirstOrDefaultAsync(r => r.BookingNumber == bookingNumber);
    }

    public async Task<List<Reservation>> GetConflictingReservationsAsync(Guid roomId, DateTime checkIn, DateTime checkOut)
    {
        return await Db.Reservations
            .Where(r => r.RoomId == roomId &&
                        r.BookingStatus != Domain.Enums.BookingStatus.Cancelled &&
                        r.BookingStatus != Domain.Enums.BookingStatus.NoShow &&
                        !(checkOut <= r.CheckInDate || checkIn >= r.CheckOutDate))
            .ToListAsync();
    }
}
