using HotelSaaS.Application.Common.Models;
using HotelSaaS.Application.DTOs;

namespace HotelSaaS.Application.Interfaces;

public interface IHousekeepingService
{
    Task<ApiResponse<List<HousekeepingTaskDto>>> GetTasksAsync();
    Task<ApiResponse<HousekeepingTaskDto>> CreateTaskAsync(CreateHousekeepingTaskDto request);
    Task<ApiResponse<HousekeepingTaskDto>> CompleteTaskAsync(Guid taskId);
}

public interface IInventoryService
{
    Task<ApiResponse<List<InventoryItemDto>>> GetInventoryItemsAsync();
    Task<ApiResponse<InventoryItemDto>> CreateInventoryItemAsync(CreateInventoryItemDto request);
    Task<ApiResponse<InventoryItemDto>> RestockItemAsync(Guid itemId, RestockInventoryDto request);
}
