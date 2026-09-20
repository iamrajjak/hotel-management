using HotelSaaS.Domain.Enums;

namespace HotelSaaS.Application.DTOs;

public record HotelDto(
    Guid Id,
    string Name,
    string Slug,
    string? LogoUrl,
    string? CoverImageUrl,
    string? Description,
    string Phone,
    string Email,
    string? Website,
    string Address,
    string City,
    string State,
    string Country,
    string Pincode,
    string CheckInTime,
    string CheckOutTime,
    string Currency,
    string Timezone,
    string? GstNumber,
    string? TaxRate,
    string? BankName,
    string? AccountNo,
    string? IfscCode,
    string? UpiId,
    string Status,
    string? WifiName = "Hotel_Guest_WiFi",
    string? WifiPassword = "Welcome2026",
    string? ReviewUrl = "https://g.page/r/your-hotel-review"
);

public class UpdateHotelDto
{
    public string Name { get; set; } = string.Empty;
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
    public string CheckInTime { get; set; } = "14:00";
    public string CheckOutTime { get; set; } = "11:00";
    public string Currency { get; set; } = "INR";
    public string Timezone { get; set; } = "Asia/Kolkata";
    public string? GstNumber { get; set; }
    public string? TaxRate { get; set; }
    public string? BankName { get; set; }
    public string? AccountNo { get; set; }
    public string? IfscCode { get; set; }
    public string? UpiId { get; set; }
    public string? WifiName { get; set; }
    public string? WifiPassword { get; set; }
    public string? ReviewUrl { get; set; }
}

public record RoomTypeDto(
    Guid Id,
    Guid HotelId,
    string Name,
    string Slug,
    string? Description,
    decimal BasePrice,
    int MaxAdults,
    int MaxChildren,
    string BedType,
    string? RoomSize,
    string AmenitiesJson,
    string Status
);

public record CreateRoomTypeDto(
    string Name,
    string? Description,
    decimal BasePrice,
    int MaxAdults,
    int MaxChildren,
    string BedType,
    string? RoomSize,
    string AmenitiesJson
);

public record RoomDto(
    long trainid,
    Guid Id,
    Guid HotelId,
    Guid RoomTypeId,
    string RoomTypeName,
    string RoomNumber,
    string Floor,
    decimal Price,
    RoomStatus Status,
    string? Notes
);

public class RoomDtos
{
	public Guid Id { get; set; }
	public Guid HotelId { get; set; }
	public Guid RoomTypeId { get; set; }

	public string RoomNumber { get; set; } = string.Empty;
	public string Floor { get; set; } = "1";
	public decimal Price { get; set; }
	public RoomStatus Status { get; set; }
	public string? Notes { get; set; }
}
public class CreateRoomDto
{
    public Guid Id { get; set; } = Guid.Empty;
    public Guid RoomTypeId { get; set; } = Guid.Empty;
    public string? RoomTypeName { get; set; }
    public string RoomNumber { get; set; } = string.Empty;
    public string Floor { get; set; } = "1st Floor";
    public decimal Price { get; set; } = 0;
    public string? Status { get; set; }
    public string? Notes { get; set; }
}

public record UpdateRoomStatusDto(
    RoomStatus Status,
    string? Notes
);
