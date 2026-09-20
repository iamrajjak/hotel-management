using HotelSaaS.Domain.Entities.Base;
using HotelSaaS.Domain.Enums;

namespace HotelSaaS.Domain.Entities;

public class Staff : TenantEntity
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Mobile { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string Role { get; set; } = "Staff";
    public string Department { get; set; } = "General"; // Reception, Housekeeping, Restaurant, Kitchen, Maintenance, Accounts, Management, Other
    public DateTime JoiningDate { get; set; } = DateTime.UtcNow;
    public decimal Salary { get; set; } = 0;
    public string Status { get; set; } = "Active"; // Active, Inactive
    public string? ProfileImage { get; set; }

    public ICollection<StaffAttendance> Attendances { get; set; } = new List<StaffAttendance>();
}

public class StaffAttendance : TenantEntity
{
    public Guid StaffId { get; set; }
    public DateTime AttendanceDate { get; set; } = DateTime.UtcNow.Date;
    public string? CheckInTime { get; set; }
    public string? CheckOutTime { get; set; }
    public AttendanceStatus Status { get; set; } = AttendanceStatus.Present;
    public string? Notes { get; set; }

    public Staff Staff { get; set; } = null!;
}
