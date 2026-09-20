using HotelSaaS.Application.Common.Models;
using HotelSaaS.Application.DTOs;
using HotelSaaS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelSaaS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly IReportService _reportService;

    public ReportsController(IReportService reportService)
    {
        _reportService = reportService;
    }

    // --- FINANCIAL REPORTS (HOTEL OWNER & SUPERADMIN ONLY) ---
    [HttpGet("revenue")]
    [Authorize(Roles = "HotelOwner,SuperAdmin")]
    public async Task<ActionResult<ApiResponse<RevenueReportDto>>> GetRevenueReport(
        [FromQuery] string range = "month",
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        var result = await _reportService.GetRevenueReportAsync(range, startDate, endDate);
        return Ok(result);
    }

    [HttpGet("expense")]
    [Authorize(Roles = "HotelOwner,SuperAdmin")]
    public async Task<ActionResult<ApiResponse<ExpenseReportDto>>> GetExpenseReport(
        [FromQuery] string range = "month",
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        var result = await _reportService.GetExpenseReportAsync(range, startDate, endDate);
        return Ok(result);
    }

    [HttpGet("profit-loss")]
    [HttpGet("pnl")]
    [Authorize(Roles = "HotelOwner,SuperAdmin")]
    public async Task<ActionResult<ApiResponse<ProfitLossReportDto>>> GetProfitLossReport(
        [FromQuery] string range = "month",
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        var result = await _reportService.GetProfitLossReportAsync(range, startDate, endDate);
        return Ok(result);
    }

    [HttpGet("staff")]
    [Authorize(Roles = "HotelOwner,SuperAdmin")]
    public async Task<ActionResult<ApiResponse<StaffReportDto>>> GetStaffReport(
        [FromQuery] string range = "month",
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        var result = await _reportService.GetStaffReportAsync(range, startDate, endDate);
        return Ok(result);
    }

    // --- OPERATIONAL REPORTS (ACCESSIBLE BY HOTEL OWNER & STAFF MANAGER) ---
    [HttpGet("occupancy")]
    public async Task<ActionResult<ApiResponse<OccupancyReportDto>>> GetOccupancyReport(
        [FromQuery] string range = "month",
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        var result = await _reportService.GetOccupancyReportAsync(range, startDate, endDate);
        return Ok(result);
    }

    [HttpGet("bookings")]
    public async Task<ActionResult<ApiResponse<BookingReportDto>>> GetBookingReport(
        [FromQuery] string range = "month",
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        var result = await _reportService.GetBookingReportAsync(range, startDate, endDate);
        return Ok(result);
    }

    [HttpGet("restaurant")]
    public async Task<ActionResult<ApiResponse<RestaurantReportDto>>> GetRestaurantReport(
        [FromQuery] string range = "month",
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        var result = await _reportService.GetRestaurantReportAsync(range, startDate, endDate);
        return Ok(result);
    }
}
