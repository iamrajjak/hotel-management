using HotelSaaS.Application.Common.Models;
using HotelSaaS.Application.DTOs;

namespace HotelSaaS.Application.Interfaces;

public interface IAuthService
{
    Task<ApiResponse<AuthResponseDto>> LoginAsync(LoginRequestDto request);
    Task<ApiResponse<AuthResponseDto>> RegisterHotelAsync(RegisterHotelRequestDto request);
    Task<ApiResponse<UserDto>> GetCurrentUserAsync(Guid userId);
    Task<ApiResponse<bool>> ResetPasswordAsync(ResetPasswordRequestDto request);
}

public interface IHotelService
{
    Task<ApiResponse<HotelDto>> GetCurrentHotelAsync();
    Task<ApiResponse<HotelDto>> GetHotelBySlugAsync(string slug);
    Task<ApiResponse<HotelDto>> UpdateHotelAsync(UpdateHotelDto request);
    Task<ApiResponse<List<HotelDto>>> GetAllHotelsAsync(); // SuperAdmin
    Task<ApiResponse<List<HotelDto>>> GetPendingHotelsAsync(); // SuperAdmin
    Task<ApiResponse<bool>> ApproveHotelAsync(Guid hotelId); // SuperAdmin
    Task<ApiResponse<bool>> RejectHotelAsync(Guid hotelId); // SuperAdmin
    Task<ApiResponse<bool>> SuspendHotelAsync(Guid hotelId); // SuperAdmin
    Task<ApiResponse<bool>> DeleteHotelAsync(Guid hotelId); // SuperAdmin
}

public interface IRoomService
{
    Task<ApiResponse<List<RoomTypeDto>>> GetRoomTypesAsync();
    Task<ApiResponse<RoomTypeDto>> CreateRoomTypeAsync(CreateRoomTypeDto request);
    Task<ApiResponse<List<RoomDto>>> GetRoomsAsync();
    Task<ApiResponse<RoomDto>> CreateRoomAsync(CreateRoomDto request);
    Task<ApiResponse<RoomDto>> UpdateRoomStatusAsync(string roomIdOrNum, UpdateRoomStatusDto request);
    Task<ApiResponse<bool>> DeleteRoomAsync(string roomIdOrNum);
    Task<ApiResponse<List<RoomDto>>> GetAvailableRoomsAsync(RoomAvailabilityQueryDto query);
}

public interface IReservationService
{
    Task<ApiResponse<List<ReservationDto>>> GetReservationsAsync();
    Task<ApiResponse<ReservationDto>> GetReservationByIdAsync(Guid id);
    Task<ApiResponse<ReservationDto>> CreateReservationAsync(CreateReservationDto request);
    Task<ApiResponse<ReservationDto>> CheckInAsync(string reservationId);
    Task<ApiResponse<ReservationDto>> CheckOutAsync(string reservationId);
    Task<ApiResponse<ReservationDto>> CancelReservationAsync(string reservationId);
    Task<ApiResponse<bool>> DeleteReservationAsync(string reservationId);
}
