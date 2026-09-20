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

public class RoomMultiTenantTests
{
    private ApplicationDbContext GetInMemoryDbContext(TenantContext tenantContext, string dbName)
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(dbName)
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new ApplicationDbContext(options, tenantContext);
    }

    private Hotel SeedHotel(ApplicationDbContext db, string name, string slug)
    {
        var hotel = new Hotel
        {
            Id = Guid.NewGuid(),
            Name = name,
            Slug = slug,
            Phone = "+91 9876543210",
            Email = $"info@{slug}.com",
            Address = "123 Main St",
            City = "Goa",
            State = "Goa",
            Country = "India",
            Pincode = "403001",
            Status = "Active"
        };
        db.Hotels.Add(hotel);
        db.SaveChanges();
        return hotel;
    }

    [Fact]
    public async Task Test1_CreateRoom_HotelA_Deluxe_Room101_Succeeds()
    {
        var dbName = Guid.NewGuid().ToString();
        var adminContext = new TenantContext();
        using var db = GetInMemoryDbContext(adminContext, dbName);
        var hotelA = SeedHotel(db, "Hotel A", "hotel-a");

        var tenantContext = new TenantContext();
        tenantContext.SetTenant(hotelA.Id, Guid.NewGuid(), "HotelOwner");

        using var dbTenant = GetInMemoryDbContext(tenantContext, dbName);
        var roomRepo = new RoomRepository(dbTenant);
        var tursoSync = new TursoSyncService(new ConfigurationBuilder().Build(), null!);
        var roomService = new RoomService(dbTenant, roomRepo, tenantContext, tursoSync);

        var req = new CreateRoomDto
        {
            RoomNumber = "101",
            RoomTypeName = "Deluxe",
            Price = 3500,
            Floor = "1st Floor",
            Status = "Available"
        };

        var result = await roomService.CreateRoomAsync(req);

        Assert.True(result.Success, result.Message);
        Assert.NotNull(result.Data);
        Assert.Equal("101", result.Data.RoomNumber);
        Assert.Equal("Deluxe", result.Data.RoomTypeName);
        Assert.Equal(hotelA.Id, result.Data.HotelId);
    }

    [Fact]
    public async Task Test2_SameHotelA_SecondRoom_Reuses_Existing_RoomType()
    {
        var dbName = Guid.NewGuid().ToString();
        var adminContext = new TenantContext();
        using var db = GetInMemoryDbContext(adminContext, dbName);
        var hotelA = SeedHotel(db, "Hotel A", "hotel-a");

        var tenantContext = new TenantContext();
        tenantContext.SetTenant(hotelA.Id, Guid.NewGuid(), "HotelOwner");

        using var dbTenant = GetInMemoryDbContext(tenantContext, dbName);
        var roomRepo = new RoomRepository(dbTenant);
        var tursoSync = new TursoSyncService(new ConfigurationBuilder().Build(), null!);
        var roomService = new RoomService(dbTenant, roomRepo, tenantContext, tursoSync);

        var req1 = new CreateRoomDto { RoomNumber = "101", RoomTypeName = "Deluxe", Price = 3500 };
        var res1 = await roomService.CreateRoomAsync(req1);
        Assert.True(res1.Success);

        var req2 = new CreateRoomDto { RoomNumber = "102", RoomTypeName = "Deluxe", Price = 3500 };
        var res2 = await roomService.CreateRoomAsync(req2);
        Assert.True(res2.Success);

        var roomTypes = await roomRepo.GetRoomTypesAsync(hotelA.Id);
        Assert.Single(roomTypes); // Same RoomType Deluxe re-used for same hotel
    }

    [Fact]
    public async Task Test3_HotelB_SameRoom101_And_Deluxe_Succeeds_Independently()
    {
        var dbName = Guid.NewGuid().ToString();
        var adminContext = new TenantContext();
        using var db = GetInMemoryDbContext(adminContext, dbName);
        var hotelA = SeedHotel(db, "Hotel A", "hotel-a");
        var hotelB = SeedHotel(db, "Hotel B", "hotel-b");

        // Hotel A creates Room 101 Deluxe
        var tenantContextA = new TenantContext();
        tenantContextA.SetTenant(hotelA.Id, Guid.NewGuid(), "HotelOwner");
        using (var dbA = GetInMemoryDbContext(tenantContextA, dbName))
        {
            var roomServiceA = new RoomService(dbA, new RoomRepository(dbA), tenantContextA, new TursoSyncService(new ConfigurationBuilder().Build(), null!));
            var resA = await roomServiceA.CreateRoomAsync(new CreateRoomDto { RoomNumber = "101", RoomTypeName = "Deluxe", Price = 3500 });
            Assert.True(resA.Success);
        }

        // Hotel B creates Room 101 Deluxe independently
        var tenantContextB = new TenantContext();
        tenantContextB.SetTenant(hotelB.Id, Guid.NewGuid(), "HotelOwner");
        using (var dbB = GetInMemoryDbContext(tenantContextB, dbName))
        {
            var roomServiceB = new RoomService(dbB, new RoomRepository(dbB), tenantContextB, new TursoSyncService(new ConfigurationBuilder().Build(), null!));
            var resB = await roomServiceB.CreateRoomAsync(new CreateRoomDto { RoomNumber = "101", RoomTypeName = "Deluxe", Price = 4000 });

            Assert.True(resB.Success, resB.Message);
            Assert.Equal("101", resB.Data!.RoomNumber);
            Assert.Equal(hotelB.Id, resB.Data.HotelId);
        }
    }

    [Fact]
    public async Task Test4_HotelA_Duplicate_Room101_Fails()
    {
        var dbName = Guid.NewGuid().ToString();
        var adminContext = new TenantContext();
        using var db = GetInMemoryDbContext(adminContext, dbName);
        var hotelA = SeedHotel(db, "Hotel A", "hotel-a");

        var tenantContext = new TenantContext();
        tenantContext.SetTenant(hotelA.Id, Guid.NewGuid(), "HotelOwner");

        using var dbTenant = GetInMemoryDbContext(tenantContext, dbName);
        var roomService = new RoomService(dbTenant, new RoomRepository(dbTenant), tenantContext, new TursoSyncService(new ConfigurationBuilder().Build(), null!));

        var req1 = new CreateRoomDto { RoomNumber = "101", RoomTypeName = "Deluxe", Price = 3500 };
        var res1 = await roomService.CreateRoomAsync(req1);
        Assert.True(res1.Success);

        var req2 = new CreateRoomDto { RoomNumber = "101", RoomTypeName = "Deluxe", Price = 3500 };
        var res2 = await roomService.CreateRoomAsync(req2);

        Assert.False(res2.Success);
        Assert.Contains("already exists in this hotel", res2.Message);
    }

    [Fact]
    public async Task Test5_Multiple_RoomTypes_Have_Unique_IDs()
    {
        var dbName = Guid.NewGuid().ToString();
        var adminContext = new TenantContext();
        using var db = GetInMemoryDbContext(adminContext, dbName);
        var hotelA = SeedHotel(db, "Hotel A", "hotel-a");

        var tenantContext = new TenantContext();
        tenantContext.SetTenant(hotelA.Id, Guid.NewGuid(), "HotelOwner");

        using var dbTenant = GetInMemoryDbContext(tenantContext, dbName);
        var roomRepo = new RoomRepository(dbTenant);
        var roomService = new RoomService(dbTenant, roomRepo, tenantContext, new TursoSyncService(new ConfigurationBuilder().Build(), null!));

        await roomService.CreateRoomTypeAsync(new CreateRoomTypeDto("Deluxe Room", "Luxury", 3000, 2, 1, "King Bed", "300 sq.ft", "[]"));
        await roomService.CreateRoomTypeAsync(new CreateRoomTypeDto("Executive Suite", "Executive", 6000, 2, 1, "King Bed", "400 sq.ft", "[]"));
        await roomService.CreateRoomTypeAsync(new CreateRoomTypeDto("Presidential Suite", "Presidential", 12000, 4, 2, "King Bed", "800 sq.ft", "[]"));

        var types = await roomRepo.GetRoomTypesAsync(hotelA.Id);
        Assert.Equal(3, types.Count);
        Assert.Equal(3, types.Select(t => t.Id).Distinct().Count());
        Assert.DoesNotContain(types, t => t.Id == Guid.Empty);
    }

    [Fact]
    public async Task Test6_Multiple_Rooms_Have_Unique_IDs()
    {
        var dbName = Guid.NewGuid().ToString();
        var adminContext = new TenantContext();
        using var db = GetInMemoryDbContext(adminContext, dbName);
        var hotelA = SeedHotel(db, "Hotel A", "hotel-a");

        var tenantContext = new TenantContext();
        tenantContext.SetTenant(hotelA.Id, Guid.NewGuid(), "HotelOwner");

        using var dbTenant = GetInMemoryDbContext(tenantContext, dbName);
        var roomRepo = new RoomRepository(dbTenant);
        var roomService = new RoomService(dbTenant, roomRepo, tenantContext, new TursoSyncService(new ConfigurationBuilder().Build(), null!));

        for (int i = 1; i <= 5; i++)
        {
            var res = await roomService.CreateRoomAsync(new CreateRoomDto { RoomNumber = $"20{i}", RoomTypeName = "Standard", Price = 2000 });
            Assert.True(res.Success);
        }

        var rooms = await roomRepo.GetRoomsWithTypesAsync(hotelA.Id);
        Assert.Equal(5, rooms.Count);
        Assert.Equal(5, rooms.Select(r => r.Id).Distinct().Count());
        Assert.DoesNotContain(rooms, r => r.Id == Guid.Empty);
    }

    [Fact]
    public async Task Test7_Seed_Multiple_Times_Is_Idempotent_Without_Errors()
    {
        var dbName = Guid.NewGuid().ToString();
        var tenantContext = new TenantContext();
        using var db = GetInMemoryDbContext(tenantContext, dbName);
        var hasher = new PasswordHasher();

        // Run seed 1st time
        DbInitializer.Initialize(db, hasher);
        int hotelCount1 = await db.Hotels.CountAsync();

        // Run seed 2nd time (should return gracefully without duplicate errors)
        DbInitializer.Initialize(db, hasher);
        int hotelCount2 = await db.Hotels.CountAsync();

        Assert.Equal(hotelCount1, hotelCount2);
    }
}
