using HotelSaaS.Application.Common.Models;
using HotelSaaS.Application.DTOs;

namespace HotelSaaS.Application.Interfaces;

public interface IReportService
{
    Task<ApiResponse<RevenueReportDto>> GetRevenueReportAsync(string range = "month", DateTime? startDate = null, DateTime? endDate = null);
    Task<ApiResponse<ExpenseReportDto>> GetExpenseReportAsync(string range = "month", DateTime? startDate = null, DateTime? endDate = null);
    Task<ApiResponse<ProfitLossReportDto>> GetProfitLossReportAsync(string range = "month", DateTime? startDate = null, DateTime? endDate = null);
    Task<ApiResponse<OccupancyReportDto>> GetOccupancyReportAsync(string range = "month", DateTime? startDate = null, DateTime? endDate = null);
    Task<ApiResponse<BookingReportDto>> GetBookingReportAsync(string range = "month", DateTime? startDate = null, DateTime? endDate = null);
    Task<ApiResponse<RestaurantReportDto>> GetRestaurantReportAsync(string range = "month", DateTime? startDate = null, DateTime? endDate = null);
    Task<ApiResponse<StaffReportDto>> GetStaffReportAsync(string range = "month", DateTime? startDate = null, DateTime? endDate = null);
}
