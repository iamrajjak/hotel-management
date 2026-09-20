using HotelSaaS.Application.Common.Interfaces;
using HotelSaaS.Application.Common.Models;
using HotelSaaS.Application.DTOs;
using HotelSaaS.Application.Interfaces;
using HotelSaaS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HotelSaaS.Infrastructure.Services;

public class CalendarService : ICalendarService
{
    private readonly ApplicationDbContext _db;
    private readonly ITenantContext _tenantContext;

    public CalendarService(ApplicationDbContext db, ITenantContext tenantContext)
    {
        _db = db;
        _tenantContext = tenantContext;
    }

    public async Task<ApiResponse<CalendarMatrixResponseDto>> GetBookingCalendarAsync(DateTime startDate, DateTime endDate)
    {
        if (endDate <= startDate)
            endDate = startDate.AddDays(14);

        var rooms = await _db.Rooms
            .Include(r => r.RoomType)
            .OrderBy(r => r.RoomNumber)
            .ToListAsync();

        var reservations = await _db.Reservations
            .Include(r => r.Customer)
            .Where(r => r.BookingStatus != Domain.Enums.BookingStatus.Cancelled &&
                        r.BookingStatus != Domain.Enums.BookingStatus.NoShow &&
                        !(r.CheckOutDate <= startDate || r.CheckInDate >= endDate))
            .ToListAsync();

        var roomRows = new List<CalendarRoomRowDto>();

        foreach (var room in rooms)
        {
            var roomBookings = reservations
                .Where(r => r.RoomId == room.Id)
                .Select(r => new CalendarBookingEventDto(
                    r.Id,
                    r.BookingNumber,
                    r.Customer?.FullName ?? "Guest",
                    r.Customer?.Phone ?? "",
                    r.CheckInDate,
                    r.CheckOutDate,
                    r.BookingStatus,
                    r.PaymentStatus,
                    r.TotalAmount
                ))
                .ToList();

            roomRows.Add(new CalendarRoomRowDto(
                room.Id,
                room.RoomNumber,
                room.RoomType?.Name ?? "Standard",
                room.Floor,
                room.Status,
                room.Price,
                roomBookings
            ));
        }

        var response = new CalendarMatrixResponseDto(startDate, endDate, roomRows);
        return ApiResponse<CalendarMatrixResponseDto>.Ok(response);
    }
}
