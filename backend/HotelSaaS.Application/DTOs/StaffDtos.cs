using HotelSaaS.Domain.Enums;

namespace HotelSaaS.Application.DTOs;

public record StaffDto(
    Guid Id,
    Guid HotelId,
    string FirstName,
    string LastName,
    string FullName,
    string Mobile,
    string Email,
    string? Address,
    string Role,
    string Department,
    DateTime JoiningDate,
    decimal Salary,
    string Status,
    string? ProfileImage,
    DateTime CreatedAt
);

public record StaffSafeDto(
    Guid Id,
    Guid HotelId,
    string FirstName,
    string LastName,
    string FullName,
    string Mobile,
    string Email,
    string? Address,
    string Role,
    string Department,
    DateTime JoiningDate,
    string Status,
    string? ProfileImage,
    DateTime CreatedAt
);

public record CreateStaffDto(
    string FirstName,
    string LastName,
    string Mobile,
    string Email,
    string? Address,
    string Role = "Staff",
    string Department = "General",
    DateTime? JoiningDate = null,
    decimal Salary = 0,
    string Status = "Active",
    string? ProfileImage = null
);

public record UpdateStaffDto(
    string FirstName,
    string LastName,
    string Mobile,
    string Email,
    string? Address,
    string Role,
    string Department,
    DateTime JoiningDate,
    decimal Salary,
    string Status,
    string? ProfileImage
);

public record StaffAttendanceDto(
    Guid Id,
    Guid HotelId,
    Guid StaffId,
    string StaffName,
    string StaffDepartment,
    DateTime AttendanceDate,
    string? CheckInTime,
    string? CheckOutTime,
    AttendanceStatus Status,
    string? Notes,
    DateTime CreatedAt
);

public record CreateStaffAttendanceDto(
    Guid StaffId,
    DateTime AttendanceDate,
    string? CheckInTime = "09:00",
    string? CheckOutTime = "18:00",
    AttendanceStatus Status = AttendanceStatus.Present,
    string? Notes = null
);

public record UpdateStaffAttendanceDto(
    string? CheckInTime,
    string? CheckOutTime,
    AttendanceStatus Status,
    string? Notes
);

public record StaffMonthlySummaryDto(
    Guid StaffId,
    string StaffName,
    string Role,
    string Department,
    int Month,
    int Year,
    int PresentDays,
    int AbsentDays,
    int HalfDays,
    int LeaveDays,
    int TotalDaysLogged,
    double AttendancePercentage
);
