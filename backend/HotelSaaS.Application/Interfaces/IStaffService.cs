using HotelSaaS.Application.Common.Models;
using HotelSaaS.Application.DTOs;

namespace HotelSaaS.Application.Interfaces;

public interface IStaffService
{
    // Staff Employee Management (Salary included for Owner, Safe view for Manager)
    Task<ApiResponse<List<StaffDto>>> GetStaffMembersAsync();
    Task<ApiResponse<List<StaffSafeDto>>> GetStaffMembersSafeAsync();
    Task<ApiResponse<StaffDto>> GetStaffByIdAsync(Guid id);
    Task<ApiResponse<StaffDto>> CreateStaffAsync(CreateStaffDto request);
    Task<ApiResponse<StaffDto>> UpdateStaffAsync(Guid id, UpdateStaffDto request);
    Task<ApiResponse<bool>> DeleteStaffAsync(Guid id);

    // Staff Attendance Operations
    Task<ApiResponse<List<StaffAttendanceDto>>> GetAttendanceAsync(DateTime? date = null, Guid? staffId = null);
    Task<ApiResponse<StaffAttendanceDto>> MarkAttendanceAsync(CreateStaffAttendanceDto request);
    Task<ApiResponse<StaffAttendanceDto>> UpdateAttendanceAsync(Guid id, UpdateStaffAttendanceDto request);
    Task<ApiResponse<List<StaffMonthlySummaryDto>>> GetMonthlyAttendanceSummaryAsync(int? month = null, int? year = null);
}
