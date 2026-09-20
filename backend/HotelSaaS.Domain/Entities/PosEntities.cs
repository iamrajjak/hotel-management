using System.ComponentModel.DataAnnotations.Schema;
using HotelSaaS.Domain.Entities.Base;

namespace HotelSaaS.Domain.Entities;

public class PosCategory : TenantEntity
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public int DisplayOrder { get; set; } = 0;

    public ICollection<PosMenuItem> MenuItems { get; set; } = new List<PosMenuItem>();
}

public class PosMenuItem : TenantEntity
{
    public Guid CategoryId { get; set; }
    [ForeignKey(nameof(CategoryId))]
    public PosCategory? Category { get; set; }

    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal Price { get; set; }
    public string? ImageUrl { get; set; }
    public bool IsAvailable { get; set; } = true;
}

public class PosOrder : TenantEntity
{
    public string OrderNumber { get; set; } = string.Empty;
    public Guid? ReservationId { get; set; }
    [ForeignKey(nameof(ReservationId))]
    public Reservation? Reservation { get; set; }

    public Guid? RoomId { get; set; }
    [ForeignKey(nameof(RoomId))]
    public Room? Room { get; set; }

    public string? TableNumber { get; set; }
    public string OrderType { get; set; } = "RoomService"; // RoomService, DineIn, Takeaway
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal Subtotal { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal Tax { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal Total { get; set; }

    public string OrderStatus { get; set; } = "Pending"; // Pending, Preparing, Ready, Served, Cancelled
    public string PaymentStatus { get; set; } = "Pending"; // Pending, ChargedToRoom, Paid

    public ICollection<PosOrderItem> OrderItems { get; set; } = new List<PosOrderItem>();
}

public class PosOrderItem : BaseEntity
{
    public Guid OrderId { get; set; }
    [ForeignKey(nameof(OrderId))]
    public PosOrder? Order { get; set; }

    public Guid MenuItemId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    [Column(TypeName = "decimal(18,2)")]
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
    [Column(TypeName = "decimal(18,2)")]
    public decimal Subtotal { get; set; }
    public string? Notes { get; set; }
}
