using HotelSaaS.Application.Common.Models;
using HotelSaaS.Application.DTOs;
using HotelSaaS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelSaaS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InventoryController : ControllerBase
{
    private readonly IInventoryService _inventoryService;

    public InventoryController(IInventoryService inventoryService)
    {
        _inventoryService = inventoryService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<InventoryItemDto>>>> GetItems()
    {
        var result = await _inventoryService.GetInventoryItemsAsync();
        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<InventoryItemDto>>> CreateItem([FromBody] CreateInventoryItemDto request)
    {
        var result = await _inventoryService.CreateInventoryItemAsync(request);
        if (!result.Success)
            return BadRequest(result);

        return Ok(result);
    }

    [HttpPost("{id}/restock")]
    public async Task<ActionResult<ApiResponse<InventoryItemDto>>> RestockItem(Guid id, [FromBody] RestockInventoryDto request)
    {
        var result = await _inventoryService.RestockItemAsync(id, request);
        if (!result.Success)
            return BadRequest(result);

        return Ok(result);
    }
}
