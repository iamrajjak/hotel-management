using HotelSaaS.Application.Common.Models;
using HotelSaaS.Application.DTOs;
using HotelSaaS.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelSaaS.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PaymentsController : ControllerBase
{
    private readonly IPaymentService _paymentService;

    public PaymentsController(IPaymentService paymentService)
    {
        _paymentService = paymentService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<PaymentDto>>>> GetPayments()
    {
        var result = await _paymentService.GetPaymentsAsync();
        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<PaymentDto>>> RecordPayment([FromBody] RecordPaymentDto request)
    {
        var result = await _paymentService.RecordPaymentAsync(request);
        if (!result.Success)
            return BadRequest(result);

        return Ok(result);
    }

    [HttpPost("razorpay/create-order")]
    public async Task<ActionResult<ApiResponse<RazorpayOrderResponseDto>>> CreateRazorpayOrder([FromBody] RazorpayOrderRequestDto request)
    {
        var result = await _paymentService.CreateRazorpayOrderAsync(request);
        return Ok(result);
    }

    [HttpPost("razorpay/verify")]
    public async Task<ActionResult<ApiResponse<PaymentDto>>> VerifyRazorpayPayment([FromBody] RazorpayVerifyRequestDto request)
    {
        var result = await _paymentService.VerifyRazorpayPaymentAsync(request);
        if (!result.Success)
            return BadRequest(result);

        return Ok(result);
    }
}
