using HotelSaaS.Application.DTOs;
using HotelSaaS.Domain.Entities;
using HotelSaaS.Domain.Enums;
using HotelSaaS.Infrastructure.Persistence;
using HotelSaaS.Infrastructure.Services;
using HotelSaaS.Infrastructure.Tenant;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace HotelSaaS.Tests;

public class AuthValidationTests
{
    private ApplicationDbContext GetInMemoryDbContext(string dbName)
    {
        var tenantContext = new TenantContext();
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(dbName)
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new ApplicationDbContext(options, tenantContext);
    }

    [Fact]
    public async Task Login_Fails_WhenEmailNotRegistered()
    {
        var dbName = Guid.NewGuid().ToString();
        using var db = GetInMemoryDbContext(dbName);
        var passwordHasher = new PasswordHasher();
        var jwtGenerator = new JwtTokenGenerator(new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { { "Jwt:Secret", "SuperSecretKeyForJWTTokenGeneration12345!" }, { "Jwt:Issuer", "HotelSaaS" }, { "Jwt:Audience", "HotelSaaS" } }).Build());
        var tursoSync = new TursoSyncService(new ConfigurationBuilder().Build(), null!);

        var authService = new AuthService(db, passwordHasher, jwtGenerator, tursoSync);

        var result = await authService.LoginAsync(new LoginRequestDto("unregistered@example.com", "Password123"));

        Assert.False(result.Success);
        Assert.Contains("Email is not registered", result.Message);
    }

    [Fact]
    public async Task Register_Fails_WhenEmailAlreadyRegistered()
    {
        var dbName = Guid.NewGuid().ToString();
        using var db = GetInMemoryDbContext(dbName);

        var existingProfile = new Profile
        {
            Id = Guid.NewGuid(),
            FullName = "Existing User",
            Email = "existing@example.com",
            Phone = "1234567890",
            PasswordHash = "Password123"
        };
        db.Profiles.Add(existingProfile);
        await db.SaveChangesAsync();

        var passwordHasher = new PasswordHasher();
        var jwtGenerator = new JwtTokenGenerator(new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { { "Jwt:Secret", "SuperSecretKeyForJWTTokenGeneration12345!" } }).Build());
        var tursoSync = new TursoSyncService(new ConfigurationBuilder().Build(), null!);

        var authService = new AuthService(db, passwordHasher, jwtGenerator, tursoSync);

        var regReq = new RegisterHotelRequestDto(
            HotelName: "New Hotel",
            OwnerFullName: "Owner Name",
            OwnerEmail: "existing@example.com",
            OwnerPassword: "Password123",
            OwnerPhone: "9876543210"
        );

        var result = await authService.RegisterHotelAsync(regReq);

        Assert.False(result.Success);
        Assert.Contains("already registered", result.Message);
    }

    [Fact]
    public async Task Register_Succeeds_SavesCompleteDataInDB()
    {
        var dbName = Guid.NewGuid().ToString();
        using var db = GetInMemoryDbContext(dbName);
        var passwordHasher = new PasswordHasher();
        var jwtGenerator = new JwtTokenGenerator(new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { { "Jwt:Secret", "SuperSecretKeyForJWTTokenGeneration12345!" } }).Build());
        var tursoSync = new TursoSyncService(new ConfigurationBuilder().Build(), null!);

        var authService = new AuthService(db, passwordHasher, jwtGenerator, tursoSync);

        var regReq = new RegisterHotelRequestDto(
            HotelName: "Royal Orchid Hotel",
            OwnerFullName: "Rajesh Kumar",
            OwnerEmail: "rajesh@royalorchid.com",
            OwnerPassword: "Password123",
            OwnerPhone: "9876543210",
            Address: "12 Main St",
            City: "Mumbai",
            State: "Maharashtra",
            Pincode: "400001"
        );

        var result = await authService.RegisterHotelAsync(regReq);

        Assert.True(result.Success, result.Message);

        var profile = await db.Profiles.FirstOrDefaultAsync(p => p.Email == "rajesh@royalorchid.com");
        Assert.NotNull(profile);
        Assert.Equal("Rajesh Kumar", profile.FullName);

        var hotel = await db.Hotels.FirstOrDefaultAsync(h => h.Name == "Royal Orchid Hotel");
        Assert.NotNull(hotel);
        Assert.Equal("PendingApproval", hotel.Status);

        Assert.False(profile.Status);
        Assert.Equal(hotel.Id, profile.HotelId);
    }

    [Fact]
    public async Task Login_Fails_WhenStatusIsInactive()
    {
        var dbName = Guid.NewGuid().ToString();
        using var db = GetInMemoryDbContext(dbName);
        var passwordHasher = new PasswordHasher();
        var jwtGenerator = new JwtTokenGenerator(new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { { "Jwt:Secret", "SuperSecretKeyForJWTTokenGeneration12345!" } }).Build());
        var tursoSync = new TursoSyncService(new ConfigurationBuilder().Build(), null!);

        var hotel = new Hotel
        {
            Id = Guid.NewGuid(),
            Name = "Disabled Hotel",
            Slug = "disabled-hotel",
            Status = "0", // Inactive status
            HotelCode = "HTL-099"
        };
        db.Hotels.Add(hotel);

        var profile = new Profile
        {
            Id = Guid.NewGuid(),
            FullName = "Inactive Owner",
            Email = "inactive@hotel.com",
            Phone = "1234567890",
            PasswordHash = passwordHasher.HashPassword("Password123"),
            HotelId = hotel.Id,
            Role = UserRole.HotelOwner,
            Status = false
        };
        db.Profiles.Add(profile);
        await db.SaveChangesAsync();

        var authService = new AuthService(db, passwordHasher, jwtGenerator, tursoSync);

        var result = await authService.LoginAsync(new LoginRequestDto("inactive@hotel.com", "Password123"));

        Assert.False(result.Success);
        Assert.Contains("pending approval", result.Message, StringComparison.OrdinalIgnoreCase);
    }
}
