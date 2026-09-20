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
public class StaffController : ControllerBase
{
    private readonly IStaffService _staffService;

    public StaffController(IStaffService staffService)
    {
        _staffService = staffService;
    }

    // --- EMPLOYEES ---
    [HttpGet]
    public async Task<IActionResult> GetStaffMembers()
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value ?? "";
        bool isOwnerOrAdmin = role.Equals("HotelOwner", StringComparison.OrdinalIgnoreCase) ||
                              role.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase) ||
                              User.FindFirst("is_super_admin")?.Value?.ToLower() == "true";

        if (isOwnerOrAdmin)
        {
            var result = await _staffService.GetStaffMembersAsync();
            return Ok(result);
        }
        else
        {
            // StaffManager safe view without salary
            var safeResult = await _staffService.GetStaffMembersSafeAsync();
            return Ok(safeResult);
        }
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "HotelOwner,SuperAdmin")]
    public async Task<ActionResult<ApiResponse<StaffDto>>> GetStaffById(Guid id)
    {
        var result = await _staffService.GetStaffByIdAsync(id);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "HotelOwner,SuperAdmin")]
    public async Task<ActionResult<ApiResponse<StaffDto>>> CreateStaff([FromBody] CreateStaffDto request)
    {
        var result = await _staffService.CreateStaffAsync(request);
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "HotelOwner,SuperAdmin")]
    public async Task<ActionResult<ApiResponse<StaffDto>>> UpdateStaff(Guid id, [FromBody] UpdateStaffDto request)
    {
        var result = await _staffService.UpdateStaffAsync(id, request);
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "HotelOwner,SuperAdmin")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteStaff(Guid id)
    {
        var result = await _staffService.DeleteStaffAsync(id);
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    // --- ATTENDANCE ---
    [HttpGet("attendance")]
    public async Task<ActionResult<ApiResponse<List<StaffAttendanceDto>>>> GetAttendance(
        [FromQuery] DateTime? date = null,
        [FromQuery] Guid? staffId = null)
    {
        var result = await _staffService.GetAttendanceAsync(date, staffId);
        return Ok(result);
    }

    [HttpPost("attendance")]
    public async Task<ActionResult<ApiResponse<StaffAttendanceDto>>> MarkAttendance([FromBody] CreateStaffAttendanceDto request)
    {
        var result = await _staffService.MarkAttendanceAsync(request);
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    [HttpPut("attendance/{id}")]
    public async Task<ActionResult<ApiResponse<StaffAttendanceDto>>> UpdateAttendance(Guid id, [FromBody] UpdateStaffAttendanceDto request)
    {
        var result = await _staffService.UpdateAttendanceAsync(id, request);
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    [HttpGet("attendance/monthly-summary")]
    public async Task<ActionResult<ApiResponse<List<StaffMonthlySummaryDto>>>> GetMonthlySummary(
        [FromQuery] int? month = null,
        [FromQuery] int? year = null)
    {
        var result = await _staffService.GetMonthlyAttendanceSummaryAsync(month, year);
        return Ok(result);
    }
}
