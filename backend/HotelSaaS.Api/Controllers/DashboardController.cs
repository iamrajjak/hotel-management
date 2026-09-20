using System.Security.Claims;
using HotelSaaS.Application.Common.Models;
using HotelSaaS.Application.DTOs;
using HotelSaaS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelSaaS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;

    public DashboardController(IDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    [HttpGet("owner")]
    [Authorize(Roles = "HotelOwner,SuperAdmin")]
    public async Task<ActionResult<ApiResponse<OwnerDashboardDto>>> GetOwnerDashboard()
    {
        var result = await _dashboardService.GetOwnerDashboardAsync();
        return Ok(result);
    }

    [HttpGet("staff-manager")]
    public async Task<ActionResult<ApiResponse<StaffManagerDashboardDto>>> GetStaffManagerDashboard()
    {
        var result = await _dashboardService.GetStaffManagerDashboardAsync();
        return Ok(result);
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetDashboardSummary()
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value ?? "";
        bool isStaffManager = role.Equals("StaffManager", StringComparison.OrdinalIgnoreCase) ||
                              role.Equals("Receptionist", StringComparison.OrdinalIgnoreCase) ||
                              role.Equals("Waiter", StringComparison.OrdinalIgnoreCase);

        if (isStaffManager)
        {
            var staffManagerDashboard = await _dashboardService.GetStaffManagerDashboardAsync();
            return Ok(staffManagerDashboard);
        }
        else
        {
            var ownerDashboard = await _dashboardService.GetOwnerDashboardAsync();
            return Ok(ownerDashboard);
        }
    }
}
