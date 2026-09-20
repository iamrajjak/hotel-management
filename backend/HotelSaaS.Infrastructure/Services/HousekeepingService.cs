using HotelSaaS.Application.Common.Interfaces;
using HotelSaaS.Application.Common.Models;
using HotelSaaS.Application.DTOs;
using HotelSaaS.Application.Interfaces;
using HotelSaaS.Domain.Entities;
using HotelSaaS.Domain.Enums;
using HotelSaaS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HotelSaaS.Infrastructure.Services;

public class HousekeepingService : IHousekeepingService
{
    private readonly ApplicationDbContext _db;
    private readonly ITenantContext _tenantContext;

    public HousekeepingService(ApplicationDbContext db, ITenantContext tenantContext)
    {
        _db = db;
        _tenantContext = tenantContext;
    }

    private Guid GetTenantHotelId()
    {
        if (_tenantContext.HotelId.HasValue && _tenantContext.HotelId.Value != Guid.Empty)
        {
            return _tenantContext.HotelId.Value;
        }
        throw new UnauthorizedAccessException("Tenant hotel context is missing or invalid.");
    }

    public async Task<ApiResponse<List<HousekeepingTaskDto>>> GetTasksAsync()
    {
        var tasks = await _db.HousekeepingTasks
            .Include(t => t.Room)
            .ThenInclude(r => r!.RoomType)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

        return ApiResponse<List<HousekeepingTaskDto>>.Ok(tasks.Select(MapToDto).ToList());
    }

    public async Task<ApiResponse<HousekeepingTaskDto>> CreateTaskAsync(CreateHousekeepingTaskDto request)
    {
        var hotelId = GetTenantHotelId();

        var room = await _db.Rooms.Include(r => r.RoomType).FirstOrDefaultAsync(r => r.Id == request.RoomId);
        if (room == null)
            return ApiResponse<HousekeepingTaskDto>.Fail("Room not found");

        var task = new HousekeepingTask
        {
            HotelId = hotelId,
            RoomId = request.RoomId,
            AssignedTo = request.AssignedTo ?? "Housekeeping Staff",
            TaskType = request.TaskType,
            Priority = request.Priority,
            Status = "Pending",
            Notes = request.Notes
        };

        _db.HousekeepingTasks.Add(task);
        await _db.SaveChangesAsync();

        task.Room = room;
        return ApiResponse<HousekeepingTaskDto>.Ok(MapToDto(task), "Housekeeping task assigned");
    }

    public async Task<ApiResponse<HousekeepingTaskDto>> CompleteTaskAsync(Guid taskId)
    {
        var task = await _db.HousekeepingTasks
            .Include(t => t.Room)
            .ThenInclude(r => r!.RoomType)
            .FirstOrDefaultAsync(t => t.Id == taskId);

        if (task == null)
            return ApiResponse<HousekeepingTaskDto>.Fail("Task not found");

        task.Status = "Completed";
        task.CompletedAt = DateTime.UtcNow;

        // Auto-update Room Status from Cleaning to Available
        if (task.Room != null && (task.Room.Status == RoomStatus.Cleaning || task.Room.Status == RoomStatus.Occupied))
        {
            task.Room.Status = RoomStatus.Available;
        }

        await _db.SaveChangesAsync();
        return ApiResponse<HousekeepingTaskDto>.Ok(MapToDto(task), $"Room {task.Room?.RoomNumber} cleaned & ready for next guest!");
    }

    private static HousekeepingTaskDto MapToDto(HousekeepingTask t) => new(
        t.Id,
        t.HotelId,
        t.RoomId,
        t.Room?.RoomNumber ?? "",
        t.Room?.RoomType?.Name ?? "Standard",
        t.AssignedTo,
        t.TaskType,
        t.Priority,
        t.Status,
        t.Notes,
        t.CreatedAt,
        t.CompletedAt
    );
}
