using HotelSaaS.Domain.Entities;
using HotelSaaS.Domain.Enums;
using HotelSaaS.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace HotelSaaS.Infrastructure.Persistence;

public static class DbInitializer
{
    public static void Initialize(ApplicationDbContext db, IPasswordHasher hasher)
    {
        db.Database.EnsureCreated();

        var alterSqls = new[]
        {
            "ALTER TABLE Hotels ADD COLUMN WifiName TEXT DEFAULT 'Hotel_Guest_WiFi';",
            "ALTER TABLE Hotels ADD COLUMN WifiPassword TEXT DEFAULT 'Welcome2026';",
            "ALTER TABLE Hotels ADD COLUMN ReviewUrl TEXT DEFAULT 'https://g.page/r/your-hotel-review';",
            "ALTER TABLE hotels ADD COLUMN wifi_name TEXT DEFAULT 'Hotel_Guest_WiFi';",
            "ALTER TABLE hotels ADD COLUMN wifi_password TEXT DEFAULT 'Welcome2026';",
            "ALTER TABLE hotels ADD COLUMN review_url TEXT DEFAULT 'https://g.page/r/your-hotel-review';"
        };
        foreach (var sql in alterSqls)
        {
            try { db.Database.ExecuteSqlRaw(sql); } catch { }
        }

        // Auto-create missing tables on existing SQLite databases
        var createTableSqls = new[]
        {
            @"CREATE TABLE IF NOT EXISTS Staffs (
                Id TEXT PRIMARY KEY,
                trainid INTEGER DEFAULT 0,
                HotelId TEXT,
                HotelCode TEXT,
                FirstName TEXT NOT NULL,
                LastName TEXT NOT NULL,
                FullName TEXT NOT NULL,
                Mobile TEXT NOT NULL,
                Email TEXT NOT NULL,
                Address TEXT,
                Role TEXT NOT NULL,
                Department TEXT NOT NULL,
                JoiningDate TEXT NOT NULL,
                Salary NUMERIC NOT NULL,
                Status TEXT NOT NULL,
                ProfileImage TEXT,
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT
            );",
            @"CREATE TABLE IF NOT EXISTS StaffAttendances (
                Id TEXT PRIMARY KEY,
                trainid INTEGER DEFAULT 0,
                HotelId TEXT,
                HotelCode TEXT,
                StaffId TEXT NOT NULL,
                AttendanceDate TEXT NOT NULL,
                CheckInTime TEXT,
                CheckOutTime TEXT,
                Status INTEGER NOT NULL,
                Notes TEXT,
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT
            );",
            @"CREATE TABLE IF NOT EXISTS Expenses (
                Id TEXT PRIMARY KEY,
                trainid INTEGER DEFAULT 0,
                HotelId TEXT,
                HotelCode TEXT,
                Category TEXT NOT NULL,
                Amount NUMERIC NOT NULL,
                Description TEXT NOT NULL,
                ExpenseDate TEXT NOT NULL,
                PaymentMethod TEXT NOT NULL,
                ReferenceNumber TEXT,
                CreatedBy TEXT,
                ReceiptUrl TEXT,
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT
            );",
            @"CREATE TABLE IF NOT EXISTS KotTickets (
                Id TEXT PRIMARY KEY,
                trainid INTEGER DEFAULT 0,
                HotelId TEXT,
                HotelCode TEXT,
                KotNumber TEXT NOT NULL,
                OrderId TEXT NOT NULL,
                TableNumber TEXT,
                OrderType INTEGER NOT NULL,
                ItemsJson TEXT NOT NULL,
                Status INTEGER NOT NULL,
                Notes TEXT,
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT
            );",
            @"CREATE TABLE IF NOT EXISTS InventoryTransactions (
                Id TEXT PRIMARY KEY,
                trainid INTEGER DEFAULT 0,
                HotelId TEXT,
                HotelCode TEXT,
                ItemId TEXT NOT NULL,
                TransactionType TEXT NOT NULL,
                Quantity INTEGER NOT NULL,
                UnitPrice NUMERIC NOT NULL,
                TotalPrice NUMERIC NOT NULL,
                TransactionDate TEXT NOT NULL,
                ReferenceNumber TEXT,
                Notes TEXT,
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT
            );",
            @"CREATE TABLE IF NOT EXISTS Suppliers (
                Id TEXT PRIMARY KEY,
                trainid INTEGER DEFAULT 0,
                HotelId TEXT,
                HotelCode TEXT,
                Name TEXT NOT NULL,
                ContactPerson TEXT NOT NULL,
                Phone TEXT NOT NULL,
                Email TEXT NOT NULL,
                Address TEXT NOT NULL,
                GstNumber TEXT,
                Status TEXT NOT NULL,
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT
            );",
            @"CREATE TABLE IF NOT EXISTS Purchases (
                Id TEXT PRIMARY KEY,
                trainid INTEGER DEFAULT 0,
                HotelId TEXT,
                HotelCode TEXT,
                SupplierId TEXT,
                PurchaseNumber TEXT NOT NULL,
                PurchaseDate TEXT NOT NULL,
                TotalAmount NUMERIC NOT NULL,
                PaymentStatus TEXT NOT NULL,
                PaymentMethod TEXT,
                Notes TEXT,
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT
            );",
            @"CREATE TABLE IF NOT EXISTS RestaurantCategories (
                Id TEXT PRIMARY KEY,
                trainid INTEGER DEFAULT 0,
                HotelId TEXT,
                HotelCode TEXT,
                Name TEXT NOT NULL,
                Description TEXT,
                SortOrder INTEGER NOT NULL,
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT
            );",
            @"CREATE TABLE IF NOT EXISTS MenuItems (
                Id TEXT PRIMARY KEY,
                trainid INTEGER DEFAULT 0,
                HotelId TEXT,
                HotelCode TEXT,
                CategoryId TEXT NOT NULL,
                Name TEXT NOT NULL,
                Description TEXT,
                Price NUMERIC NOT NULL,
                ImageUrl TEXT,
                IsVeg INTEGER NOT NULL,
                IsAvailable INTEGER NOT NULL,
                PreparationTime INTEGER NOT NULL,
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT
            );",
            @"CREATE TABLE IF NOT EXISTS RestaurantTables (
                Id TEXT PRIMARY KEY,
                trainid INTEGER DEFAULT 0,
                HotelId TEXT,
                HotelCode TEXT,
                TableNumber TEXT NOT NULL,
                Capacity INTEGER NOT NULL,
                Status TEXT NOT NULL,
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT
            );",
            @"CREATE TABLE IF NOT EXISTS Orders (
                Id TEXT PRIMARY KEY,
                trainid INTEGER DEFAULT 0,
                HotelId TEXT,
                HotelCode TEXT,
                OrderNumber TEXT NOT NULL,
                TableId TEXT,
                RoomId TEXT,
                ReservationId TEXT,
                OrderType INTEGER NOT NULL,
                Status INTEGER NOT NULL,
                Subtotal NUMERIC NOT NULL,
                TaxAmount NUMERIC NOT NULL,
                DiscountAmount NUMERIC NOT NULL,
                TotalAmount NUMERIC NOT NULL,
                PaymentMethod TEXT,
                PaymentStatus TEXT,
                Notes TEXT,
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT
            );",
            @"CREATE TABLE IF NOT EXISTS OrderItems (
                Id TEXT PRIMARY KEY,
                trainid INTEGER DEFAULT 0,
                HotelId TEXT,
                HotelCode TEXT,
                OrderId TEXT NOT NULL,
                MenuItemId TEXT NOT NULL,
                Quantity INTEGER NOT NULL,
                UnitPrice NUMERIC NOT NULL,
                TotalPrice NUMERIC NOT NULL,
                Notes TEXT,
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT
            );"
        };

        foreach (var sql in createTableSqls)
        {
            try
            {
                db.Database.ExecuteSqlRaw(sql);
            }
            catch { }
        }

        // Ensure trainid, HotelCode, and StaffPasswordHash columns exist on all entity tables (using raw ADO.NET to suppress noisy EF Core fail logs)
        try
        {
            var conn = db.Database.GetDbConnection();
            if (conn.State != System.Data.ConnectionState.Open)
            {
                conn.Open();
            }

            var allTables = new[]
            {
                "Hotels", "Profiles", "RoomTypes", "Rooms", "Customers", "Reservations", "Invoices", "Payments",
                "PosCategories", "PosMenuItems", "PosOrders", "PosOrderItems", "HousekeepingTasks", "InventoryItems",
                "Communications", "RestaurantCategories", "MenuItems", "RestaurantTables", "Orders", "OrderItems",
                "KotTickets", "Staffs", "StaffAttendances", "InventoryTransactions", "Suppliers", "Purchases",
                "Expenses", "Enquiries", "EventSpaces", "EventBookings", "Coupons", "Reviews", "AuditLogs"
            };

            foreach (var tableName in allTables)
            {
                try
                {
                    using var cmd1 = conn.CreateCommand();
                    cmd1.CommandText = $"ALTER TABLE {tableName} ADD COLUMN trainid INTEGER DEFAULT 0;";
                    cmd1.ExecuteNonQuery();
                }
                catch { }

                try
                {
                    using var cmd2 = conn.CreateCommand();
                    cmd2.CommandText = $"ALTER TABLE {tableName} ADD COLUMN HotelCode TEXT;";
                    cmd2.ExecuteNonQuery();
                }
                catch { }
            }

            try
            {
                using var cmd3 = conn.CreateCommand();
                cmd3.CommandText = "ALTER TABLE Profiles ADD COLUMN StaffPasswordHash TEXT;";
                cmd3.ExecuteNonQuery();
            }
            catch { }

            // Seed sample staff member if a hotel exists but no staff exists yet
            try
            {
                var sampleHotel = db.Hotels.FirstOrDefault();
                if (sampleHotel != null && !db.Staffs.Any())
                {
                    var hotelId = sampleHotel.Id;
                    var hotelCode = sampleHotel.HotelCode ?? "HTL-MAIN";

                    var staff1 = new Staff
                    {
                        Id = Guid.NewGuid(),
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

                    db.Staffs.Add(staff1);

                    var attendance1 = new StaffAttendance
                    {
                        Id = Guid.NewGuid(),
                        HotelId = hotelId,
                        HotelCode = hotelCode,
                        StaffId = staff1.Id,
                        AttendanceDate = DateTime.UtcNow.Date,
                        CheckInTime = "09:00",
                        CheckOutTime = "18:00",
                        Status = AttendanceStatus.Present,
                        Notes = "Shift On Time"
                    };

                    db.StaffAttendances.Add(attendance1);
                    db.SaveChanges();
                }
            }
            catch { }
        }
        catch { }
    }
}

