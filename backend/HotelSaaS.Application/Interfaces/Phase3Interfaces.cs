using HotelSaaS.Application.Common.Models;
using HotelSaaS.Application.DTOs;

namespace HotelSaaS.Application.Interfaces;

public interface IInvoiceService
{
    Task<ApiResponse<List<InvoiceDto>>> GetInvoicesAsync();
    Task<ApiResponse<InvoiceDto>> GetInvoiceByIdAsync(Guid id);
    Task<ApiResponse<InvoiceDto>> GetInvoiceByReservationIdAsync(Guid reservationId);
}

public interface IPaymentService
{
    Task<ApiResponse<List<PaymentDto>>> GetPaymentsAsync();
    Task<ApiResponse<PaymentDto>> RecordPaymentAsync(RecordPaymentDto request);
    Task<ApiResponse<RazorpayOrderResponseDto>> CreateRazorpayOrderAsync(RazorpayOrderRequestDto request);
    Task<ApiResponse<PaymentDto>> VerifyRazorpayPaymentAsync(RazorpayVerifyRequestDto request);
}
