using HotelSaaS.Application.Common.Interfaces;
using HotelSaaS.Application.Common.Models;
using HotelSaaS.Application.DTOs;
using HotelSaaS.Application.Interfaces;
using HotelSaaS.Domain.Enums;
using HotelSaaS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HotelSaaS.Infrastructure.Services;

public class DashboardService : IDashboardService
{
    private readonly ApplicationDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly IReservationService _reservationService;
    private readonly IRestaurantService _restaurantService;
    private readonly IExpenseService _expenseService;

    public DashboardService(
        ApplicationDbContext db,
        ITenantContext tenantContext,
        IReservationService reservationService,
        IRestaurantService restaurantService,
        IExpenseService expenseService)
    {
        _db = db;
        _tenantContext = tenantContext;
        _reservationService = reservationService;
        _restaurantService = restaurantService;
        _expenseService = expenseService;
    }

    public async Task<ApiResponse<OwnerDashboardDto>> GetOwnerDashboardAsync()
    {
        var now = DateTime.UtcNow;
        var startOfMonth = new DateTime(now.Year, now.Month, 1);

        var payments = await _db.Payments.Where(p => p.PaymentStatus == PaymentStatus.Paid).ToListAsync();
        decimal totalRevenue = payments.Sum(p => p.Amount);
        decimal monthlyRevenue = payments.Where(p => p.PaymentDate >= startOfMonth).Sum(p => p.Amount);

        var orders = await _db.Orders.Where(o => o.Status != OrderStatus.Cancelled).ToListAsync();
        decimal orderRevenue = orders.Sum(o => o.TotalAmount);
        totalRevenue += orderRevenue;
        monthlyRevenue += orders.Where(o => o.CreatedAt >= startOfMonth).Sum(o => o.TotalAmount);

        var expenses = await _db.Expenses.ToListAsync();
        decimal totalExpenses = expenses.Sum(e => e.Amount);
        decimal netProfit = totalRevenue - totalExpenses;

        var rooms = await _db.Rooms.ToListAsync();
        int totalRooms = rooms.Count;
        int occupiedCount = rooms.Count(r => r.Status == RoomStatus.Occupied || r.Status == RoomStatus.Reserved);
        double occupancyPct = totalRooms > 0 ? Math.Round((double)occupiedCount / totalRooms * 100, 1) : 0;

        var pendingReservations = await _db.Reservations
            .Where(r => r.DueAmount > 0 && r.BookingStatus != BookingStatus.Cancelled)
            .ToListAsync();

        decimal pendingPaymentsAmount = pendingReservations.Sum(r => r.DueAmount);
        int pendingPaymentsCount = pendingReservations.Count;

        int pendingKotCount = await _db.KotTickets.CountAsync(k => k.Status == KotStatus.Pending || k.Status == KotStatus.Preparing);

        var recentBookingsRes = await _reservationService.GetReservationsAsync();
        var recentBookings = recentBookingsRes.Data?.Take(5).ToList() ?? new List<ReservationDto>();

        var recentOrdersRes = await _restaurantService.GetOrdersAsync();
        var recentOrders = recentOrdersRes.Data?.Take(5).ToList() ?? new List<RestaurantOrderDto>();

        var recentExpensesRes = await _expenseService.GetExpensesAsync();
        var recentExpenses = recentExpensesRes.Data?.Take(5).ToList() ?? new List<ExpenseDto>();

        return ApiResponse<OwnerDashboardDto>.Ok(new OwnerDashboardDto(
            totalRevenue, monthlyRevenue, totalExpenses, netProfit, occupancyPct,
            pendingPaymentsAmount, pendingPaymentsCount, pendingKotCount,
            recentBookings, recentOrders, recentExpenses
        ));
    }

    public async Task<ApiResponse<StaffManagerDashboardDto>> GetStaffManagerDashboardAsync()
    {
        var now = DateTime.UtcNow;
        var today = now.Date;

        var rooms = await _db.Rooms.ToListAsync();
        int totalRooms = rooms.Count;
        int availableRooms = rooms.Count(r => r.Status == RoomStatus.Available);
        int occupiedRooms = rooms.Count(r => r.Status == RoomStatus.Occupied);
        int reservedRooms = rooms.Count(r => r.Status == RoomStatus.Reserved);

        double occupancyPct = totalRooms > 0 ? Math.Round((double)(occupiedRooms + reservedRooms) / totalRooms * 100, 1) : 0;

        int todayCheckIns = await _db.Reservations.CountAsync(r => r.CheckInDate.Date == today && r.BookingStatus != BookingStatus.Cancelled);
        int todayCheckOuts = await _db.Reservations.CountAsync(r => r.CheckOutDate.Date == today && r.BookingStatus != BookingStatus.Cancelled);

        int pendingPaymentsCount = await _db.Reservations.CountAsync(r => r.DueAmount > 0 && r.BookingStatus != BookingStatus.Cancelled);
        int pendingKotCount = await _db.KotTickets.CountAsync(k => k.Status == KotStatus.Pending || k.Status == KotStatus.Preparing);

        var recentBookingsRes = await _reservationService.GetReservationsAsync();
        var recentBookings = recentBookingsRes.Data?.Take(5).ToList() ?? new List<ReservationDto>();

        var recentOrdersRes = await _restaurantService.GetOrdersAsync();
        var recentOrders = recentOrdersRes.Data?.Take(5).ToList() ?? new List<RestaurantOrderDto>();

        return ApiResponse<StaffManagerDashboardDto>.Ok(new StaffManagerDashboardDto(
            totalRooms, availableRooms, occupiedRooms, reservedRooms, occupancyPct,
            todayCheckIns, todayCheckOuts, pendingPaymentsCount, pendingKotCount,
            recentBookings, recentOrders
        ));
    }
}
