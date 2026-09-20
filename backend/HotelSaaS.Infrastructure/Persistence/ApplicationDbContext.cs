using HotelSaaS.Application.Common.Interfaces;
using HotelSaaS.Domain.Entities;
using HotelSaaS.Domain.Entities.Base;
using Microsoft.EntityFrameworkCore;

namespace HotelSaaS.Infrastructure.Persistence;

public class ApplicationDbContext : DbContext
{
    private readonly ITenantContext? _tenantContext;

    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options, ITenantContext? tenantContext = null)
        : base(options)
    {
        _tenantContext = tenantContext;
    }

    public DbSet<Hotel> Hotels => Set<Hotel>();
    public DbSet<Profile> Profiles => Set<Profile>();
    public DbSet<RoomType> RoomTypes => Set<RoomType>();
    public DbSet<Room> Rooms => Set<Room>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Reservation> Reservations => Set<Reservation>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<Payment> Payments => Set<Payment>();

    // Restaurant POS Module
    public DbSet<PosCategory> PosCategories => Set<PosCategory>();
    public DbSet<PosMenuItem> PosMenuItems => Set<PosMenuItem>();
    public DbSet<PosOrder> PosOrders => Set<PosOrder>();
    public DbSet<PosOrderItem> PosOrderItems => Set<PosOrderItem>();

    // Housekeeping & Inventory Modules
    public DbSet<HousekeepingTask> HousekeepingTasks => Set<HousekeepingTask>();
    public DbSet<InventoryItem> InventoryItems => Set<InventoryItem>();
    public DbSet<Communication> Communications => Set<Communication>();
    public DbSet<RestaurantCategory> RestaurantCategories => Set<RestaurantCategory>();
    public DbSet<MenuItem> MenuItems => Set<MenuItem>();
    public DbSet<RestaurantTable> RestaurantTables => Set<RestaurantTable>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<KotTicket> KotTickets => Set<KotTicket>();
    public DbSet<Staff> Staffs => Set<Staff>();
    public DbSet<StaffAttendance> StaffAttendances => Set<StaffAttendance>();
    public DbSet<InventoryTransaction> InventoryTransactions => Set<InventoryTransaction>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<Purchase> Purchases => Set<Purchase>();
    public DbSet<Expense> Expenses => Set<Expense>();
    public DbSet<Enquiry> Enquiries => Set<Enquiry>();
    public DbSet<EventSpace> EventSpaces => Set<EventSpace>();
    public DbSet<EventBooking> EventBookings => Set<EventBooking>();
    public DbSet<Coupon> Coupons => Set<Coupon>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Apply decimal precision (18,2) for all financial fields across entities
        foreach (var property in modelBuilder.Model.GetEntityTypes()
                     .SelectMany(t => t.GetProperties())
                     .Where(p => p.ClrType == typeof(decimal) || p.ClrType == typeof(decimal?)))
        {
            property.SetColumnType("decimal(18,2)");
        }

        // Configure auto-incrementing trainid for all entities
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(BaseEntity).IsAssignableFrom(entityType.ClrType))
            {
                modelBuilder.Entity(entityType.ClrType)
                    .Property("trainid")
                    .ValueGeneratedOnAdd();
            }
        }

        // Configure Global Query Filter for Multi-Tenant Isolation
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(TenantEntity).IsAssignableFrom(entityType.ClrType))
            {
                var method = typeof(ApplicationDbContext)
                    .GetMethod(nameof(SetTenantFilter), System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)!
                    .MakeGenericMethod(entityType.ClrType);
                method.Invoke(this, new object[] { modelBuilder });
            }
        }

        // Indexes & Unique Constraints
        modelBuilder.Entity<Hotel>().HasIndex(h => h.Slug).IsUnique();
        modelBuilder.Entity<Profile>().HasIndex(p => p.Email).IsUnique();
        modelBuilder.Entity<RoomType>().HasIndex(rt => new { rt.HotelId, rt.Slug }).IsUnique();
        modelBuilder.Entity<Room>().HasIndex(r => new { r.HotelId, r.RoomNumber }).IsUnique();
        modelBuilder.Entity<Reservation>().HasIndex(r => new { r.HotelId, r.BookingNumber }).IsUnique();
        modelBuilder.Entity<Reservation>().HasIndex(r => new { r.HotelId, r.RoomId, r.CheckInDate, r.CheckOutDate });
        modelBuilder.Entity<Invoice>().HasIndex(i => new { i.HotelId, i.InvoiceNumber }).IsUnique();
        modelBuilder.Entity<Coupon>().HasIndex(c => new { c.HotelId, c.Code }).IsUnique();
    }

    private void SetTenantFilter<TEntity>(ModelBuilder modelBuilder) where TEntity : TenantEntity
    {
        modelBuilder.Entity<TEntity>().HasQueryFilter(e =>
            _tenantContext == null ||
            _tenantContext.IsSuperAdmin ||
            (_tenantContext.HotelId.HasValue && _tenantContext.HotelId.Value != Guid.Empty && e.HotelId == _tenantContext.HotelId.Value));
    }

    private static readonly System.Collections.Concurrent.ConcurrentDictionary<Type, long> _trainIdCounters = new();

    private void ProcessEntries()
    {
        var entries = ChangeTracker.Entries()
            .Where(e => e.State == EntityState.Added || e.State == EntityState.Modified)
            .ToList();

        var utcNow = DateTime.UtcNow;

        foreach (var entry in entries)
        {
            if (entry.Entity is BaseEntity baseEntity)
            {
                if (entry.State == EntityState.Added)
                {
                    if (baseEntity.Id == Guid.Empty)
                    {
                        baseEntity.Id = Guid.NewGuid();
                    }
                    if (baseEntity.CreatedAt == default)
                    {
                        baseEntity.CreatedAt = utcNow;
                    }
                    baseEntity.UpdatedAt = utcNow;

                    if (baseEntity.trainid == 0)
                    {
                        var entityType = baseEntity.GetType();
                        long currentMax = _trainIdCounters.GetOrAdd(entityType, 0L);
                        currentMax++;
                        _trainIdCounters[entityType] = currentMax;
                        baseEntity.trainid = currentMax;
                    }
                }
                else if (entry.State == EntityState.Modified)
                {
                    baseEntity.UpdatedAt = utcNow;
                }
            }
        }
    }

    public override int SaveChanges()
    {
        ProcessEntries();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        ProcessEntries();
        return base.SaveChangesAsync(cancellationToken);
    }
}
