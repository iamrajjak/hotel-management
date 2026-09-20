using HotelSaaS.Domain.Entities.Base;
using HotelSaaS.Domain.Enums;

namespace HotelSaaS.Domain.Entities;

public class RestaurantCategory : TenantEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int SortOrder { get; set; } = 0;
}

public class MenuItem : TenantEntity
{
    public Guid CategoryId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public string? ImageUrl { get; set; }
    public bool IsVeg { get; set; } = true;
    public bool IsAvailable { get; set; } = true;
    public int PreparationTime { get; set; } = 15; // in minutes

    public RestaurantCategory Category { get; set; } = null!;
}

public class RestaurantTable : TenantEntity
{
    public string TableNumber { get; set; } = string.Empty;
    public int Capacity { get; set; } = 4;
    public string Status { get; set; } = "Available"; // Available, Occupied, Reserved
}

public class Order : TenantEntity
{
    public string OrderNumber { get; set; } = string.Empty;
    public Guid? TableId { get; set; }
    public Guid? RoomId { get; set; }
    public Guid? ReservationId { get; set; }
    public OrderType OrderType { get; set; } = OrderType.DineIn;
    public OrderStatus Status { get; set; } = OrderStatus.New;
    public decimal Subtotal { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public string? PaymentMethod { get; set; } = "Cash";
    public string? PaymentStatus { get; set; } = "Paid";
    public string? Notes { get; set; }

    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
    public ICollection<KotTicket> KotTickets { get; set; } = new List<KotTicket>();
}

public class OrderItem : TenantEntity
{
    public Guid OrderId { get; set; }
    public Guid MenuItemId { get; set; }
    public int Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice { get; set; }
    public string? Notes { get; set; }

    public MenuItem MenuItem { get; set; } = null!;
}

public class KotTicket : TenantEntity
{
    public string KotNumber { get; set; } = string.Empty;
    public Guid OrderId { get; set; }
    public string? TableNumber { get; set; }
    public OrderType OrderType { get; set; } = OrderType.DineIn;
    public string ItemsJson { get; set; } = "[]";
    public KotStatus Status { get; set; } = KotStatus.Pending;
    public string? Notes { get; set; }

    public Order Order { get; set; } = null!;
}

public class Expense : TenantEntity
{
    public string Category { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateTime ExpenseDate { get; set; } = DateTime.UtcNow;
    public string PaymentMethod { get; set; } = "Cash";
    public string? ReferenceNumber { get; set; }
    public string? CreatedBy { get; set; }
    public string? ReceiptUrl { get; set; }
}

public class Enquiry : TenantEntity
{
    public string Name { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime? EventDate { get; set; }
    public int? Guests { get; set; }
    public EnquiryStatus Status { get; set; } = EnquiryStatus.New;
}

public class EventSpace : TenantEntity
{
    public string Name { get; set; } = string.Empty;
    public int Capacity { get; set; } = 100;
    public decimal PricePerHour { get; set; }
    public string? Description { get; set; }
}

public class EventBooking : TenantEntity
{
    public Guid SpaceId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerPhone { get; set; } = string.Empty;
    public DateTime EventDate { get; set; }
    public string StartTime { get; set; } = "10:00";
    public string EndTime { get; set; } = "18:00";
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = "Confirmed";

    public EventSpace Space { get; set; } = null!;
}

public class Coupon : TenantEntity
{
    public string Code { get; set; } = string.Empty;
    public DiscountType DiscountType { get; set; } = DiscountType.Percentage;
    public decimal DiscountValue { get; set; }
    public decimal MinBookingAmount { get; set; } = 0;
    public decimal MaxDiscountAmount { get; set; } = 0;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int UsageLimit { get; set; } = 100;
    public int UsedCount { get; set; } = 0;
    public bool IsActive { get; set; } = true;
}

public class Review : TenantEntity
{
    public string CustomerName { get; set; } = string.Empty;
    public int Rating { get; set; } = 5;
    public string Comment { get; set; } = string.Empty;
    public bool IsApproved { get; set; } = false;
}

public class AuditLog : TenantEntity
{
    public Guid UserId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string Entity { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string MetadataJson { get; set; } = "{}";
}

public class InventoryTransaction : TenantEntity
{
    public Guid ItemId { get; set; }
    public string TransactionType { get; set; } = "Restock";
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice { get; set; }
    public DateTime TransactionDate { get; set; } = DateTime.UtcNow;
    public string? ReferenceNumber { get; set; }
    public string? Notes { get; set; }
}

public class Supplier : TenantEntity
{
    public string Name { get; set; } = string.Empty;
    public string ContactPerson { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string? GstNumber { get; set; }
    public string Status { get; set; } = "Active";
}

public class Purchase : TenantEntity
{
    public Guid? SupplierId { get; set; }
    public string PurchaseNumber { get; set; } = string.Empty;
    public DateTime PurchaseDate { get; set; } = DateTime.UtcNow;
    public decimal TotalAmount { get; set; }
    public string PaymentStatus { get; set; } = "Paid";
    public string? PaymentMethod { get; set; } = "BankTransfer";
    public string? Notes { get; set; }
}

