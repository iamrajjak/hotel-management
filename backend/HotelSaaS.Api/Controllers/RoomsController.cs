using HotelSaaS.Application.Common.Interfaces;
using HotelSaaS.Application.Common.Models;
using HotelSaaS.Application.DTOs;
using HotelSaaS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelSaaS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RoomsController : ControllerBase
{
    private readonly IRoomRepository _roomRepository;
    private readonly IRoomService _roomService;
    private readonly ITenantContext _tenantContext;


    public RoomsController(
        IRoomRepository roomRepository,
        IRoomService roomService,
        ITenantContext tenantContext)
    {
        _roomRepository = roomRepository;
        _roomService = roomService;
        _tenantContext = tenantContext;
    }

	[AllowAnonymous]
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<RoomDto>>>> GetRooms()
    {
        // Calling repository & service for database room retrieval
        var result = await _roomService.GetRoomsAsync();
        return Ok(result);
    }

    [AllowAnonymous]
    [HttpPost]
    public async Task<ActionResult<ApiResponse<RoomDto>>> CreateRoom([FromBody] CreateRoomDto request)
    {
        var result = await _roomService.CreateRoomAsync(request);
        if (!result.Success)
            return BadRequest(result);

        return Ok(result);
    }

    [AllowAnonymous]
    [HttpGet("types")]
    public async Task<ActionResult<ApiResponse<List<RoomTypeDto>>>> GetRoomTypes()
    {
        var result = await _roomService.GetRoomTypesAsync();
        return Ok(result);
    }

    [AllowAnonymous]
    [HttpPost("types")]
    public async Task<ActionResult<ApiResponse<RoomTypeDto>>> CreateRoomType([FromBody] CreateRoomTypeDto request)
    {
        var result = await _roomService.CreateRoomTypeAsync(request);
        if (!result.Success)
            return BadRequest(result);

        return Ok(result);
    }

    [AllowAnonymous]
    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<RoomDto>>> UpdateRoom(string id, [FromBody] CreateRoomDto request)
    {
        var result = await _roomService.CreateRoomAsync(request);
        if (!result.Success)
            return BadRequest(result);

        return Ok(result);
    }

    [AllowAnonymous]
    [HttpPut("{id}/status")]
    public async Task<ActionResult<ApiResponse<RoomDto>>> UpdateStatus(string id, [FromBody] UpdateRoomStatusDto request)
    {
        var result = await _roomService.UpdateRoomStatusAsync(id, request);
        if (!result.Success)
            return BadRequest(result);

        return Ok(result);
    }

    [AllowAnonymous]
    [HttpGet("availability")]
    public async Task<ActionResult<ApiResponse<List<RoomDto>>>> GetAvailability([FromQuery] DateTime checkIn, [FromQuery] DateTime checkOut, [FromQuery] int adults = 1, [FromQuery] int children = 0)
    {
        var query = new RoomAvailabilityQueryDto(checkIn, checkOut, adults, children);
        var result = await _roomService.GetAvailableRoomsAsync(query);
        if (!result.Success)
            return BadRequest(result);

        return Ok(result);
    }

    [Authorize(Roles = "SuperAdmin,HotelOwner,Manager")]
    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteRoom(string id)
    {
        var result = await _roomService.DeleteRoomAsync(id);
        if (!result.Success)
            return BadRequest(result);

        return Ok(result);
    }
    // GET /api/rooms/all
    [AllowAnonymous]
    [HttpGet("all")]
    public async Task<ActionResult<List<RoomDto>>> GetAllRooms()
    {
        var apiResult = await _roomService.GetRoomsAsync();
        return Ok(apiResult.Data ?? new List<RoomDto>());
    }

}
