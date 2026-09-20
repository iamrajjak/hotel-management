using HotelSaaS.Application.Common.Models;
using HotelSaaS.Application.DTOs;

namespace HotelSaaS.Application.Interfaces;

public interface IDashboardService
{
    Task<ApiResponse<OwnerDashboardDto>> GetOwnerDashboardAsync();
    Task<ApiResponse<StaffManagerDashboardDto>> GetStaffManagerDashboardAsync();
}
