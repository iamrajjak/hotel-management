using HotelSaaS.Application.Common.Models;
using HotelSaaS.Application.DTOs;
using HotelSaaS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelSaaS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HousekeepingController : ControllerBase
{
    private readonly IHousekeepingService _housekeepingService;

    public HousekeepingController(IHousekeepingService housekeepingService)
    {
        _housekeepingService = housekeepingService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<HousekeepingTaskDto>>>> GetTasks()
    {
        var result = await _housekeepingService.GetTasksAsync();
        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<HousekeepingTaskDto>>> CreateTask([FromBody] CreateHousekeepingTaskDto request)
    {
        var result = await _housekeepingService.CreateTaskAsync(request);
        if (!result.Success)
            return BadRequest(result);

        return Ok(result);
    }

    [HttpPost("{id}/complete")]
    public async Task<ActionResult<ApiResponse<HousekeepingTaskDto>>> CompleteTask(Guid id)
    {
        var result = await _housekeepingService.CompleteTaskAsync(id);
        if (!result.Success)
            return BadRequest(result);

        return Ok(result);
    }
}
