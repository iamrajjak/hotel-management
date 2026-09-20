using HotelSaaS.Application.Common.Models;
using HotelSaaS.Application.DTOs;
using HotelSaaS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelSaaS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HotelsController : ControllerBase
{
    private readonly IHotelService _hotelService;

    public HotelsController(IHotelService hotelService)
    {
        _hotelService = hotelService;
    }

    [AllowAnonymous]
    [HttpGet("current")]
    public async Task<ActionResult<ApiResponse<HotelDto>>> GetCurrentHotel()
    {
        var result = await _hotelService.GetCurrentHotelAsync();
        if (!result.Success)
            return NotFound(result);

        return Ok(result);
    }

    [AllowAnonymous]
    [HttpPut("current")]
    public async Task<ActionResult<ApiResponse<HotelDto>>> UpdateHotel([FromBody] UpdateHotelDto request)
    {
        var result = await _hotelService.UpdateHotelAsync(request);
        if (!result.Success)
            return BadRequest(result);

        return Ok(result);
    }

    [HttpGet("public/{slug}")]
    public async Task<ActionResult<ApiResponse<HotelDto>>> GetHotelBySlug(string slug)
    {
        var result = await _hotelService.GetHotelBySlugAsync(slug);
        if (!result.Success)
            return NotFound(result);

        return Ok(result);
    }

    [Authorize(Roles = "SuperAdmin")]
    [HttpGet("all")]
    public async Task<ActionResult<ApiResponse<List<HotelDto>>>> GetAllHotels()
    {
        var result = await _hotelService.GetAllHotelsAsync();
        return Ok(result);
    }

    [Authorize(Roles = "SuperAdmin")]
    [HttpGet("pending-approvals")]
    public async Task<ActionResult<ApiResponse<List<HotelDto>>>> GetPendingHotels()
    {
        var result = await _hotelService.GetPendingHotelsAsync();
        return Ok(result);
    }

    [Authorize(Roles = "SuperAdmin")]
    [HttpPost("{id}/approve")]
    public async Task<ActionResult<ApiResponse<bool>>> ApproveHotel(Guid id)
    {
        var result = await _hotelService.ApproveHotelAsync(id);
        if (!result.Success)
            return BadRequest(result);

        return Ok(result);
    }

    [Authorize(Roles = "SuperAdmin")]
    [HttpPost("{id}/reject")]
    public async Task<ActionResult<ApiResponse<bool>>> RejectHotel(Guid id)
    {
        var result = await _hotelService.RejectHotelAsync(id);
        if (!result.Success)
            return BadRequest(result);

        return Ok(result);
    }

    [Authorize(Roles = "SuperAdmin")]
    [HttpPost("{id}/suspend")]
    public async Task<ActionResult<ApiResponse<bool>>> SuspendHotel(Guid id)
    {
        var result = await _hotelService.SuspendHotelAsync(id);
        if (!result.Success)
            return BadRequest(result);

        return Ok(result);
    }

    [Authorize(Roles = "SuperAdmin")]
    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteHotel(Guid id)
    {
        var result = await _hotelService.DeleteHotelAsync(id);
        if (!result.Success)
            return BadRequest(result);

        return Ok(result);
    }
}
