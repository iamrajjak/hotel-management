using HotelSaaS.Application.Common.Models;
using HotelSaaS.Application.DTOs;

namespace HotelSaaS.Application.Interfaces;

public interface ICustomerService
{
    Task<ApiResponse<List<CustomerDto>>> GetCustomersAsync();
    Task<ApiResponse<CustomerDto>> GetCustomerByIdAsync(Guid id);
    Task<ApiResponse<CustomerDto>> CreateCustomerAsync(CreateCustomerDto request);
    Task<ApiResponse<CustomerDto>> UpdateCustomerAsync(Guid id, CreateCustomerDto request);
    Task<ApiResponse<bool>> DeleteCustomerAsync(Guid id);
}

public interface ICalendarService
{
    Task<ApiResponse<CalendarMatrixResponseDto>> GetBookingCalendarAsync(DateTime startDate, DateTime endDate);
}
