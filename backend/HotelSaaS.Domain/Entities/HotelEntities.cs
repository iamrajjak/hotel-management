using HotelSaaS.Domain.Entities.Base;
using HotelSaaS.Domain.Enums;

namespace HotelSaaS.Domain.Entities;

public class Hotel : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? LogoUrl { get; set; }
    public string? CoverImageUrl { get; set; }
    public string? Description { get; set; }
    public string Phone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Website { get; set; }
    public string Address { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public string Pincode { get; set; } = string.Empty;
    public string CheckInTime { get; set; } = "12:00";
    public string CheckOutTime { get; set; } = "11:00";
    public string Currency { get; set; } = "INR";
    public string Timezone { get; set; } = "Asia/Kolkata";
    public string? GstNumber { get; set; }
    public string? TaxRate { get; set; } = "12%";
    public string? BankName { get; set; }
    public string? AccountNo { get; set; }
    public string? IfscCode { get; set; }
    public string? UpiId { get; set; }
    public string Status { get; set; } = "Active";
    public string HotelCode { get; set; } = string.Empty;
    public string? WifiName { get; set; } = "Hotel_Guest_WiFi";
    public string? WifiPassword { get; set; } = "Welcome2026";
    public string? ReviewUrl { get; set; } = "https://g.page/r/your-hotel-review";

    // Navigation
    public ICollection<Profile> Profiles { get; set; } = new List<Profile>();
    public ICollection<RoomType> RoomTypes { get; set; } = new List<RoomType>();
    public ICollection<Room> Rooms { get; set; } = new List<Room>();
}

public class Profile : BaseEntity
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public string? StaffPasswordHash { get; set; }
    public bool IsSuperAdmin { get; set; } = false;

    // Direct Hotel User fields (Consolidated from HotelUsers)
    public Guid? HotelId { get; set; }
    public string? HotelCode { get; set; }
    public UserRole Role { get; set; } = UserRole.HotelOwner;
    public bool Status { get; set; } = false;

    // Navigation
    public Hotel? Hotel { get; set; }
}
