using HotelSaaS.Application.Common.Models;
using HotelSaaS.Application.DTOs;
using HotelSaaS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelSaaS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReservationsController : ControllerBase
{
    private readonly IReservationService _reservationService;

    public ReservationsController(IReservationService reservationService)
    {
        _reservationService = reservationService;
    }

    [AllowAnonymous]
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<ReservationDto>>>> GetReservations()
    {
        var result = await _reservationService.GetReservationsAsync();
        return Ok(result);
    }

    [AllowAnonymous]
    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<ReservationDto>>> GetReservationById(Guid id)
    {
        var result = await _reservationService.GetReservationByIdAsync(id);
        if (!result.Success)
            return NotFound(result);

        return Ok(result);
    }

    [AllowAnonymous]
    [HttpPost]
    public async Task<ActionResult<ApiResponse<ReservationDto>>> CreateReservation([FromBody] CreateReservationDto request)
    {
        var result = await _reservationService.CreateReservationAsync(request);
        if (!result.Success)
            return BadRequest(result);

        return Ok(result);
    }

    [HttpPost("public")]
    public async Task<ActionResult<ApiResponse<ReservationDto>>> CreatePublicReservation([FromBody] CreateReservationDto request)
    {
        var result = await _reservationService.CreateReservationAsync(request);
        if (!result.Success)
            return BadRequest(result);

        return Ok(result);
    }

    [AllowAnonymous]
    [HttpPost("{id}/check-in")]
    public async Task<ActionResult<ApiResponse<ReservationDto>>> CheckIn(string id)
    {
        var result = await _reservationService.CheckInAsync(id);
        if (!result.Success)
            return BadRequest(result);

        return Ok(result);
    }

    [AllowAnonymous]
    [HttpPost("{id}/check-out")]
    public async Task<ActionResult<ApiResponse<ReservationDto>>> CheckOut(string id)
    {
        var result = await _reservationService.CheckOutAsync(id);
        if (!result.Success)
            return BadRequest(result);

        return Ok(result);
    }

    [AllowAnonymous]
    [HttpPost("{id}/cancel")]
    public async Task<ActionResult<ApiResponse<ReservationDto>>> Cancel(string id)
    {
        var result = await _reservationService.CancelReservationAsync(id);
        if (!result.Success)
            return BadRequest(result);

        return Ok(result);
    }

    [AllowAnonymous]
    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteReservation(string id)
    {
        var result = await _reservationService.DeleteReservationAsync(id);
        if (!result.Success)
            return BadRequest(result);

        return Ok(result);
    }
}
