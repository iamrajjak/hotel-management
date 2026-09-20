using HotelSaaS.Application.Common.Models;
using HotelSaaS.Application.DTOs;

namespace HotelSaaS.Application.Interfaces;

public interface IPosService
{
    Task<ApiResponse<List<PosCategoryDto>>> GetMenuCategoriesAsync();
    Task<ApiResponse<List<PosOrderDto>>> GetActiveOrdersAsync();
    Task<ApiResponse<PosOrderDto>> CreatePosOrderAsync(CreatePosOrderDto request);
    Task<ApiResponse<PosOrderDto>> UpdateOrderStatusAsync(Guid orderId, string status);
    Task<ApiResponse<PosMenuItemDto>> CreateMenuItemAsync(CreatePosMenuItemDto request);
    Task<ApiResponse<PosMenuItemDto>> UpdateMenuItemAsync(Guid itemId, UpdatePosMenuItemDto request);
    Task<ApiResponse<bool>> DeleteMenuItemAsync(Guid itemId);
}
