using HotelSaaS.Application.Common.Models;
using HotelSaaS.Application.DTOs;
using HotelSaaS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelSaaS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PosController : ControllerBase
{
    private readonly IPosService _posService;

    public PosController(IPosService posService)
    {
        _posService = posService;
    }

    [AllowAnonymous]
    [HttpGet("menu")]
    public async Task<ActionResult<ApiResponse<List<PosCategoryDto>>>> GetMenu()
    {
        var result = await _posService.GetMenuCategoriesAsync();
        return Ok(result);
    }

    [AllowAnonymous]
    [HttpGet("orders")]
    public async Task<ActionResult<ApiResponse<List<PosOrderDto>>>> GetOrders()
    {
        var result = await _posService.GetActiveOrdersAsync();
        return Ok(result);
    }

    [AllowAnonymous]
    [HttpPost("orders")]
    public async Task<ActionResult<ApiResponse<PosOrderDto>>> CreateOrder([FromBody] CreatePosOrderDto request)
    {
        var result = await _posService.CreatePosOrderAsync(request);
        if (!result.Success)
            return BadRequest(result);

        return Ok(result);
    }

    [AllowAnonymous]
    [HttpPut("orders/{id}/status")]
    public async Task<ActionResult<ApiResponse<PosOrderDto>>> UpdateStatus(Guid id, [FromBody] string status)
    {
        var result = await _posService.UpdateOrderStatusAsync(id, status);
        if (!result.Success)
            return BadRequest(result);

        return Ok(result);
    }

    [AllowAnonymous]
    [HttpPost("menu/items")]
    public async Task<ActionResult<ApiResponse<PosMenuItemDto>>> CreateMenuItem([FromBody] CreatePosMenuItemDto request)
    {
        var result = await _posService.CreateMenuItemAsync(request);
        if (!result.Success)
            return BadRequest(result);

        return Ok(result);
    }

    [AllowAnonymous]
    [HttpPut("menu/items/{id}")]
    public async Task<ActionResult<ApiResponse<PosMenuItemDto>>> UpdateMenuItem(Guid id, [FromBody] UpdatePosMenuItemDto request)
    {
        var result = await _posService.UpdateMenuItemAsync(id, request);
        if (!result.Success)
            return BadRequest(result);

        return Ok(result);
    }

    [AllowAnonymous]
    [HttpDelete("menu/items/{id}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteMenuItem(Guid id)
    {
        var result = await _posService.DeleteMenuItemAsync(id);
        if (!result.Success)
            return BadRequest(result);

        return Ok(result);
    }
}
