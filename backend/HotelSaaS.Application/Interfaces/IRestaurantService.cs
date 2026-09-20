using HotelSaaS.Application.Common.Models;
using HotelSaaS.Application.DTOs;
using HotelSaaS.Domain.Enums;

namespace HotelSaaS.Application.Interfaces;

public interface IRestaurantService
{
    // Categories
    Task<ApiResponse<List<RestaurantCategoryDto>>> GetCategoriesAsync();
    Task<ApiResponse<RestaurantCategoryDto>> CreateCategoryAsync(CreateRestaurantCategoryDto request);
    Task<ApiResponse<RestaurantCategoryDto>> UpdateCategoryAsync(Guid id, CreateRestaurantCategoryDto request);
    Task<ApiResponse<bool>> DeleteCategoryAsync(Guid id);

    // Menu Items
    Task<ApiResponse<List<MenuItemDto>>> GetMenuItemsAsync(Guid? categoryId = null);
    Task<ApiResponse<MenuItemDto>> CreateMenuItemAsync(CreateMenuItemDto request);
    Task<ApiResponse<MenuItemDto>> UpdateMenuItemAsync(Guid id, CreateMenuItemDto request);
    Task<ApiResponse<bool>> DeleteMenuItemAsync(Guid id);

    // Tables
    Task<ApiResponse<List<RestaurantTableDto>>> GetTablesAsync();
    Task<ApiResponse<RestaurantTableDto>> CreateTableAsync(CreateRestaurantTableDto request);
    Task<ApiResponse<RestaurantTableDto>> UpdateTableStatusAsync(Guid id, UpdateRestaurantTableStatusDto request);
    Task<ApiResponse<bool>> DeleteTableAsync(Guid id);

    // Orders
    Task<ApiResponse<List<RestaurantOrderDto>>> GetOrdersAsync(OrderStatus? status = null);
    Task<ApiResponse<RestaurantOrderDto>> GetOrderByIdAsync(Guid id);
    Task<ApiResponse<RestaurantOrderDto>> CreateOrderAsync(CreateRestaurantOrderDto request);
    Task<ApiResponse<RestaurantOrderDto>> UpdateOrderStatusAsync(Guid id, UpdateOrderStatusDto request);
    Task<ApiResponse<bool>> CancelOrderAsync(Guid id);

    // KOT
    Task<ApiResponse<List<KotTicketDto>>> GetKotTicketsAsync(KotStatus? status = null);
    Task<ApiResponse<KotTicketDto>> UpdateKotStatusAsync(Guid id, UpdateKotStatusDto request);
}
