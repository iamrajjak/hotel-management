using HotelSaaS.Domain.Entities.Base;
using HotelSaaS.Domain.Enums;

namespace HotelSaaS.Domain.Entities;

public class RoomType : TenantEntity
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal BasePrice { get; set; }
    public int MaxAdults { get; set; } = 2;
    public int MaxChildren { get; set; } = 1;
    public string BedType { get; set; } = "King";
    public string? RoomSize { get; set; }
    public string AmenitiesJson { get; set; } = "[]";
    public string Status { get; set; } = "Active";

    public Hotel Hotel { get; set; } = null!;
    public ICollection<Room> Rooms { get; set; } = new List<Room>();
}

public class Room : TenantEntity
{
    public Guid RoomTypeId { get; set; }
    public string RoomNumber { get; set; } = string.Empty;
    public string Floor { get; set; } = "1";
    public decimal Price { get; set; }
    public RoomStatus Status { get; set; } = RoomStatus.Available;
    public string? Notes { get; set; }

    public Hotel Hotel { get; set; } = null!;
    public RoomType RoomType { get; set; } = null!;
    public ICollection<Reservation> Reservations { get; set; } = new List<Reservation>();
}

public class Customer : TenantEntity
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; }
    public string? IdType { get; set; }
    public string? IdNumber { get; set; }
    public string? IdDocumentUrl { get; set; }
    public string? Notes { get; set; }

    public Hotel Hotel { get; set; } = null!;
    public ICollection<Reservation> Reservations { get; set; } = new List<Reservation>();
}

public class Reservation : TenantEntity
{
    public string BookingNumber { get; set; } = string.Empty;
    public Guid CustomerId { get; set; }
    public Guid RoomId { get; set; }
    public DateTime CheckInDate { get; set; }
    public DateTime CheckOutDate { get; set; }
    public int Adults { get; set; } = 1;
    public int Children { get; set; } = 0;
    public decimal BaseAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal DueAmount { get; set; }
    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Pending;
    public BookingStatus BookingStatus { get; set; } = BookingStatus.Pending;
    public string BookingSource { get; set; } = "Direct";
    public string? SpecialRequest { get; set; }

    public Hotel Hotel { get; set; } = null!;
    public Customer Customer { get; set; } = null!;
    public Room Room { get; set; } = null!;
    public ICollection<Invoice> Invoices { get; set; } = new List<Invoice>();
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}

public class Invoice : TenantEntity
{
    public Guid ReservationId { get; set; }
    public Guid CustomerId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public decimal Subtotal { get; set; }
    public decimal Discount { get; set; }
    public decimal Tax { get; set; }
    public decimal Total { get; set; }
    public decimal Paid { get; set; }
    public decimal Due { get; set; }
    public string Status { get; set; } = "Unpaid";
    public DateTime IssuedAt { get; set; } = DateTime.UtcNow;

    public Hotel Hotel { get; set; } = null!;
    public Reservation Reservation { get; set; } = null!;
    public Customer Customer { get; set; } = null!;
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}

public class Payment : TenantEntity
{
    public Guid ReservationId { get; set; }
    public Guid? InvoiceId { get; set; }
    public decimal Amount { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    public string? TransactionId { get; set; }
    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Paid;
    public DateTime PaymentDate { get; set; } = DateTime.UtcNow;
    public string? Notes { get; set; }

    public Hotel Hotel { get; set; } = null!;
    public Reservation Reservation { get; set; } = null!;
    public Invoice? Invoice { get; set; }
}
