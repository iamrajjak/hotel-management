using HotelSaaS.Application.DTOs;
using HotelSaaS.Domain.Entities;
using HotelSaaS.Domain.Enums;
using HotelSaaS.Infrastructure.Persistence;
using HotelSaaS.Infrastructure.Persistence.Repositories;
using HotelSaaS.Infrastructure.Services;
using HotelSaaS.Infrastructure.Tenant;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace HotelSaaS.Tests;

public class TenantIsolationAndBookingTests
{
    private ApplicationDbContext GetInMemoryDbContext(TenantContext tenantContext, string dbName)
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(dbName)
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new ApplicationDbContext(options, tenantContext);
    }

    [Fact]
    public async Task TenantIsolation_HotelAUser_CannotAccess_HotelBData()
    {
        var dbName = Guid.NewGuid().ToString();
        var hotelAId = Guid.NewGuid();
        var hotelBId = Guid.NewGuid();

        // 1. Seed Hotel A and Hotel B data using administrative context
        var adminContext = new TenantContext();
        adminContext.SetTenant(Guid.Empty, Guid.NewGuid(), "SuperAdmin", isSuperAdmin: true);

        using (var db = GetInMemoryDbContext(adminContext, dbName))
        {
            var roomTypeA = new RoomType { HotelId = hotelAId, Name = "Hotel A Suite", Slug = "suite-a", BasePrice = 5000 };
            var roomTypeB = new RoomType { HotelId = hotelBId, Name = "Hotel B Suite", Slug = "suite-b", BasePrice = 6000 };
            db.RoomTypes.AddRange(roomTypeA, roomTypeB);

            var roomA = new Room { HotelId = hotelAId, RoomTypeId = roomTypeA.Id, RoomNumber = "101", Price = 5000 };
            var roomB = new Room { HotelId = hotelBId, RoomTypeId = roomTypeB.Id, RoomNumber = "101", Price = 6000 };
            db.Rooms.AddRange(roomA, roomB);

            await db.SaveChangesAsync();
        }

        // 2. Query rooms as Hotel A user context
        var hotelAContext = new TenantContext();
        hotelAContext.SetTenant(hotelAId, Guid.NewGuid(), "HotelOwner");

        using (var dbA = GetInMemoryDbContext(hotelAContext, dbName))
        {
            var roomRepoA = new RoomRepository(dbA);
            var tursoSyncA = new TursoSyncService(new ConfigurationBuilder().Build(), null!);
            var roomServiceA = new RoomService(dbA, roomRepoA, hotelAContext, tursoSyncA);
            var resultA = await roomServiceA.GetRoomsAsync();

            Assert.True(resultA.Success);
            Assert.Single(resultA.Data!);
            Assert.Equal("101", resultA.Data![0].RoomNumber);
            Assert.Equal(hotelAId, resultA.Data![0].HotelId);
            Assert.DoesNotContain(resultA.Data, r => r.HotelId == hotelBId);
        }
    }

    [Fact]
    public async Task DoubleBookingPrevention_Fails_WhenDatesOverlap()
    {
        var dbName = Guid.NewGuid().ToString();
        var hotelId = Guid.NewGuid();

        var tenantContext = new TenantContext();
        tenantContext.SetTenant(hotelId, Guid.NewGuid(), "Manager");

        using var db = GetInMemoryDbContext(tenantContext, dbName);

        var hotel = new Hotel { Id = hotelId, Name = "Test Hotel", Slug = "test-hotel", HotelCode = "HTL-001" };
        db.Hotels.Add(hotel);

        var roomType = new RoomType { HotelId = hotelId, Name = "Deluxe", Slug = "deluxe", BasePrice = 3000 };
        db.RoomTypes.Add(roomType);

        var room = new Room { HotelId = hotelId, RoomTypeId = roomType.Id, RoomNumber = "202", Price = 3000 };
        db.Rooms.Add(room);
        await db.SaveChangesAsync();

        var tursoSync = new TursoSyncService(new ConfigurationBuilder().Build(), null!);
        var reservationService = new ReservationService(db, tenantContext, tursoSync, null!);

        // First Reservation: 2026-09-01 to 2026-09-05
        var res1Req = new CreateReservationDto
        {
            CustomerId = null,
            CustomerName = "John Doe",
            CustomerEmail = "john@example.com",
            CustomerPhone = "+1234567890",
            RoomId = room.Id,
            CheckInDate = DateTime.Today.AddDays(1),
            CheckOutDate = DateTime.Today.AddDays(5),
            Adults = 2,
            Children = 0,
            BaseAmount = 12000,
            DiscountAmount = 0,
            TaxAmount = 0
        };

        var res1Result = await reservationService.CreateReservationAsync(res1Req);
        Assert.True(res1Result.Success);

        // Second Reservation (Overlapping dates)
        var res2Req = new CreateReservationDto
        {
            CustomerId = null,
            CustomerName = "Jane Smith",
            CustomerEmail = "jane@example.com",
            CustomerPhone = "+1987654321",
            RoomId = room.Id,
            CheckInDate = DateTime.Today.AddDays(3),
            CheckOutDate = DateTime.Today.AddDays(7),
            Adults = 1,
            Children = 0,
            BaseAmount = 12000,
            DiscountAmount = 0,
            TaxAmount = 0
        };

        var res2Result = await reservationService.CreateReservationAsync(res2Req);

        Assert.False(res2Result.Success);
        Assert.Contains("already reserved", res2Result.Message);
    }
}
