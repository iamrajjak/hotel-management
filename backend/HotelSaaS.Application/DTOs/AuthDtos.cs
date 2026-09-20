using HotelSaaS.Domain.Enums;

namespace HotelSaaS.Application.DTOs;

public record LoginRequestDto(string Email, string Password, string? Role = null);

public record ResetPasswordRequestDto(string Email, string TargetRole, string NewPassword);

public record RegisterHotelRequestDto(
    string HotelName,
    string? HotelSlug = null,
    string? Phone = null,
    string? Email = null,
    string? Address = null,
    string? City = null,
    string? State = null,
    string? Country = null,
    string? Pincode = null,
    string OwnerFullName = "",
    string OwnerEmail = "",
    string OwnerPassword = "",
    string StaffPassword = "",
    string? OwnerPhone = null
);

public record AuthResponseDto(
    string Token,
    Guid UserId,
    string FullName,
    string Email,
    Guid? HotelId,
    string? HotelName,
    string? HotelCode,
    string Role,
    bool IsSuperAdmin
);

public record UserDto(
    Guid Id,
    string FullName,
    string Email,
    string Phone,
    string Role,
    string Status
);
