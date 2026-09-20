using Microsoft.EntityFrameworkCore;
using HotelSaaS.Infrastructure.Persistence;
using HotelSaaS.Domain.Entities;
using HotelSaaS.Domain.Enums;
using System.IO;

namespace InsertStaffApp;

class Program
{
    static async Task Main(string[] args)
    {
        Console.WriteLine("=== CLEANING LOCAL SQLITE DATABASE STAFFS TABLE ===");

        var dbPath = Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "backend", "HotelSaaS.Api", "hotelsaas.db"));
        if (!File.Exists(dbPath))
        {
            dbPath = Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "..", "backend", "HotelSaaS.Api", "hotelsaas.db"));
        }

        Console.WriteLine($"[INFO] SQLite Database Path: {dbPath}");

        var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();
        optionsBuilder.UseSqlite($"Data Source={dbPath}");

        using var db = new ApplicationDbContext(optionsBuilder.Options);

        // Remove old duplicate test staff rows
        var oldStaffs = await db.Staffs.ToListAsync();
        db.Staffs.RemoveRange(oldStaffs);
        await db.SaveChangesAsync();
        Console.WriteLine("[SUCCESS] Cleared old duplicate test rows from local SQLite DB!");

        var sampleHotel = await db.Hotels.FirstOrDefaultAsync();
        var hotelId = sampleHotel?.Id ?? Guid.Parse("00000000-0000-0000-0000-000000000001");
        var hotelCode = sampleHotel?.HotelCode ?? "HTL-001";

        var staff1 = new Staff
        {
            Id = Guid.Parse("00000000-0000-0000-0009-000000000001"),
            HotelId = hotelId,
            HotelCode = hotelCode,
            FirstName = "Vikram",
            LastName = "Singh",
            FullName = "Vikram Singh",
            Mobile = "9876543210",
            Email = "vikram@hotel.com",
            Address = "Main Market, Jodhpur",
            Role = "Senior Front Desk Executive",
            Department = "Reception",
            JoiningDate = DateTime.UtcNow.AddMonths(-6),
            Salary = 25000,
            Status = "Active"
        };

        var staff2 = new Staff
        {
            Id = Guid.Parse("2051918e-8083-4e69-92b4-c2790a550ae3"),
            HotelId = hotelId,
            HotelCode = hotelCode,
            FirstName = "Amit",
            LastName = "Sharma",
            FullName = "Amit Sharma",
            Mobile = "9812345678",
            Email = "amit.sharma@hotelsaas.com",
            Address = "Sector 14, Udaipur",
            Role = "Front Desk Manager",
            Department = "Reception",
            JoiningDate = DateTime.UtcNow,
            Salary = 32000,
            Status = "Active"
        };

        db.Staffs.Add(staff1);
        db.Staffs.Add(staff2);
        await db.SaveChangesAsync();

        Console.WriteLine("[SUCCESS] Seeded 2 clean staff records in local SQLite DB!");
        var allStaff = await db.Staffs.ToListAsync();
        foreach (var s in allStaff)
        {
            Console.WriteLine($"- {s.FullName} | {s.Role} | {s.Mobile} | {s.Email}");
        }
    }
}
