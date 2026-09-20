using HotelSaaS.Application.Common.Models;
using HotelSaaS.Application.DTOs;
using HotelSaaS.Application.Interfaces;
using HotelSaaS.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelSaaS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RestaurantController : ControllerBase
{
    private readonly IRestaurantService _restaurantService;

    public RestaurantController(IRestaurantService restaurantService)
    {
        _restaurantService = restaurantService;
    }

    // --- CATEGORIES ---
    [HttpGet("categories")]
    public async Task<ActionResult<ApiResponse<List<RestaurantCategoryDto>>>> GetCategories()
    {
        var result = await _restaurantService.GetCategoriesAsync();
        return Ok(result);
    }

    [HttpPost("categories")]
    [Authorize(Roles = "HotelOwner,StaffManager,Manager,SuperAdmin")]
    public async Task<ActionResult<ApiResponse<RestaurantCategoryDto>>> CreateCategory([FromBody] CreateRestaurantCategoryDto request)
    {
        var result = await _restaurantService.CreateCategoryAsync(request);
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    [HttpPut("categories/{id}")]
    [Authorize(Roles = "HotelOwner,StaffManager,Manager,SuperAdmin")]
    public async Task<ActionResult<ApiResponse<RestaurantCategoryDto>>> UpdateCategory(Guid id, [FromBody] CreateRestaurantCategoryDto request)
    {
        var result = await _restaurantService.UpdateCategoryAsync(id, request);
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    [HttpDelete("categories/{id}")]
    [Authorize(Roles = "HotelOwner,SuperAdmin")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteCategory(Guid id)
    {
        var result = await _restaurantService.DeleteCategoryAsync(id);
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    // --- MENU ITEMS ---
    [HttpGet("menu")]
    public async Task<ActionResult<ApiResponse<List<MenuItemDto>>>> GetMenuItems([FromQuery] Guid? categoryId = null)
    {
        var result = await _restaurantService.GetMenuItemsAsync(categoryId);
        return Ok(result);
    }

    [HttpPost("menu")]
    [Authorize(Roles = "HotelOwner,StaffManager,Manager,SuperAdmin")]
    public async Task<ActionResult<ApiResponse<MenuItemDto>>> CreateMenuItem([FromBody] CreateMenuItemDto request)
    {
        var result = await _restaurantService.CreateMenuItemAsync(request);
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    [HttpPut("menu/{id}")]
    [Authorize(Roles = "HotelOwner,StaffManager,Manager,SuperAdmin")]
    public async Task<ActionResult<ApiResponse<MenuItemDto>>> UpdateMenuItem(Guid id, [FromBody] CreateMenuItemDto request)
    {
        var result = await _restaurantService.UpdateMenuItemAsync(id, request);
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    [HttpDelete("menu/{id}")]
    [Authorize(Roles = "HotelOwner,SuperAdmin")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteMenuItem(Guid id)
    {
        var result = await _restaurantService.DeleteMenuItemAsync(id);
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    // --- TABLES ---
    [HttpGet("tables")]
    public async Task<ActionResult<ApiResponse<List<RestaurantTableDto>>>> GetTables()
    {
        var result = await _restaurantService.GetTablesAsync();
        return Ok(result);
    }

    [HttpPost("tables")]
    [Authorize(Roles = "HotelOwner,StaffManager,Manager,SuperAdmin")]
    public async Task<ActionResult<ApiResponse<RestaurantTableDto>>> CreateTable([FromBody] CreateRestaurantTableDto request)
    {
        var result = await _restaurantService.CreateTableAsync(request);
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    [HttpPut("tables/{id}/status")]
    public async Task<ActionResult<ApiResponse<RestaurantTableDto>>> UpdateTableStatus(Guid id, [FromBody] UpdateRestaurantTableStatusDto request)
    {
        var result = await _restaurantService.UpdateTableStatusAsync(id, request);
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    [HttpDelete("tables/{id}")]
    [Authorize(Roles = "HotelOwner,SuperAdmin")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteTable(Guid id)
    {
        var result = await _restaurantService.DeleteTableAsync(id);
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    // --- ORDERS ---
    [HttpGet("orders")]
    public async Task<ActionResult<ApiResponse<List<RestaurantOrderDto>>>> GetOrders([FromQuery] OrderStatus? status = null)
    {
        var result = await _restaurantService.GetOrdersAsync(status);
        return Ok(result);
    }

    [HttpGet("orders/{id}")]
    public async Task<ActionResult<ApiResponse<RestaurantOrderDto>>> GetOrderById(Guid id)
    {
        var result = await _restaurantService.GetOrderByIdAsync(id);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }

    [HttpPost("orders")]
    public async Task<ActionResult<ApiResponse<RestaurantOrderDto>>> CreateOrder([FromBody] CreateRestaurantOrderDto request)
    {
        var result = await _restaurantService.CreateOrderAsync(request);
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    [HttpPut("orders/{id}/status")]
    public async Task<ActionResult<ApiResponse<RestaurantOrderDto>>> UpdateOrderStatus(Guid id, [FromBody] UpdateOrderStatusDto request)
    {
        var result = await _restaurantService.UpdateOrderStatusAsync(id, request);
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    [HttpPost("orders/{id}/cancel")]
    public async Task<ActionResult<ApiResponse<bool>>> CancelOrder(Guid id)
    {
        var result = await _restaurantService.CancelOrderAsync(id);
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }

    // --- KOT ---
    [HttpGet("kot")]
    public async Task<ActionResult<ApiResponse<List<KotTicketDto>>>> GetKotTickets([FromQuery] KotStatus? status = null)
    {
        var result = await _restaurantService.GetKotTicketsAsync(status);
        return Ok(result);
    }

    [HttpPut("kot/{id}/status")]
    public async Task<ActionResult<ApiResponse<KotTicketDto>>> UpdateKotStatus(Guid id, [FromBody] UpdateKotStatusDto request)
    {
        var result = await _restaurantService.UpdateKotStatusAsync(id, request);
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }
}
