using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using HotelSaaS.Domain.Entities.Base;

namespace HotelSaaS.Domain.Entities;

public class HousekeepingTask : TenantEntity
{
    public Guid RoomId { get; set; }
    [ForeignKey(nameof(RoomId))]
    public Room? Room { get; set; }

    public string? AssignedTo { get; set; }
    public string TaskType { get; set; } = "RoutineClean"; // RoutineClean, DeepClean, Inspection, Maintenance
    public string Priority { get; set; } = "Medium"; // Low, Medium, High, Urgent
    public string Status { get; set; } = "Pending"; // Pending, InProgress, Completed, Cancelled
    public string? Notes { get; set; }
    public DateTime? CompletedAt { get; set; }
}

public class InventoryItem : TenantEntity
{
    public string ItemName { get; set; } = string.Empty;
    public string Category { get; set; } = "Linen"; // Linen, Toiletries, CleaningSupplies, F&B, General
    public decimal Quantity { get; set; } = 0;
    public string Unit { get; set; } = "pcs"; // pcs, kg, liters, boxes, bottles
    public decimal ReorderLevel { get; set; } = 10;
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal UnitCost { get; set; } = 0;
    public DateTime? LastRestockedAt { get; set; }
}

/// <summary>
/// Communication Entity with comprehensive code-level Data Annotations & Validations
/// </summary>
public class Communication : TenantEntity
{
    [Required(ErrorMessage = "Sender name is required")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Sender name must be between 2 and 100 characters")]
    public string SenderName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Email address is required")]
    [EmailAddress(ErrorMessage = "Invalid email format")]
    [StringLength(150, ErrorMessage = "Email cannot exceed 150 characters")]
    public string SenderEmail { get; set; } = string.Empty;

    [Required(ErrorMessage = "Phone number is required")]
    [RegularExpression(@"^[6-9]\d{9}$", ErrorMessage = "Phone number must be a valid 10-digit Indian mobile number")]
    [StringLength(15, ErrorMessage = "Phone number cannot exceed 15 characters")]
    public string SenderPhone { get; set; } = string.Empty;

    [Required(ErrorMessage = "Subject is required")]
    [StringLength(200, MinimumLength = 3, ErrorMessage = "Subject must be between 3 and 200 characters")]
    public string Subject { get; set; } = string.Empty;

    [Required(ErrorMessage = "Message content is required")]
    [StringLength(2000, MinimumLength = 5, ErrorMessage = "Message must be between 5 and 2000 characters")]
    public string Message { get; set; } = string.Empty;

    [Required(ErrorMessage = "Communication channel is required")]
    [StringLength(50)]
    public string Channel { get; set; } = "WebsiteContact"; // WebsiteContact, Email, SMS, WhatsApp, Concierge

    [Required]
    [StringLength(50)]
    public string Status { get; set; } = "Pending"; // Pending, Sent, Delivered, Read, Failed

    public Guid? CustomerId { get; set; }
    [ForeignKey(nameof(CustomerId))]
    public Customer? Customer { get; set; }

    public Guid? ReservationId { get; set; }
    [ForeignKey(nameof(ReservationId))]
    public Reservation? Reservation { get; set; }

    public DateTime SentAt { get; set; } = DateTime.UtcNow;
}
