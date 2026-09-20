using System.Linq.Expressions;
using HotelSaaS.Domain.Entities;
using HotelSaaS.Domain.Enums;

namespace HotelSaaS.Application.Common.Interfaces;

public interface IRepository<TEntity> where TEntity : class
{
    Task<List<TEntity>> GetAllAsync();
    Task<TEntity?> GetByIdAsync(Guid id);
    Task<List<TEntity>> FindAsync(Expression<Func<TEntity, bool>> predicate);
    Task AddAsync(TEntity entity);
    void Update(TEntity entity);
    void Delete(TEntity entity);
    Task<int> SaveChangesAsync();
}

public interface IRoomRepository : IRepository<Room>
{
    Task<List<Room>> GetRoomsWithTypesAsync(Guid hotelId);
    Task<Room?> GetRoomByNumberAsync(string roomNumber, Guid hotelId);
    Task<List<RoomType>> GetRoomTypesAsync(Guid hotelId);
    Task<RoomType?> GetRoomTypeByIdOrNameAsync(Guid roomTypeId, string? roomTypeName, Guid hotelId);
    Task AddRoomTypeAsync(RoomType roomType);
    Task<List<Room>> GetAvailableRoomsAsync(DateTime checkIn, DateTime checkOut, int adults, Guid hotelId);
}

public interface IReservationRepository : IRepository<Reservation>
{
    Task<List<Reservation>> GetReservationsWithDetailsAsync();
    Task<Reservation?> GetReservationByIdWithDetailsAsync(Guid id);
    Task<Reservation?> GetByBookingNumberAsync(string bookingNumber);
    Task<List<Reservation>> GetConflictingReservationsAsync(Guid roomId, DateTime checkIn, DateTime checkOut);
}

public interface ICustomerRepository : IRepository<Customer>
{
    Task<Customer?> GetByPhoneOrEmailAsync(string phone, string? email);
    Task<List<Customer>> GetCustomersWithStaysAsync();
}
