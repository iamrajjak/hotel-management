using HotelSaaS.Application.Common.Interfaces;
using HotelSaaS.Application.Common.Models;
using HotelSaaS.Application.DTOs;
using HotelSaaS.Application.Interfaces;
using HotelSaaS.Domain.Enums;
using HotelSaaS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HotelSaaS.Infrastructure.Services;

public class ReportService : IReportService
{
    private readonly ApplicationDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly ITursoSyncService _tursoSync;

    public ReportService(ApplicationDbContext db, ITenantContext tenantContext, ITursoSyncService tursoSync)
    {
        _db = db;
        _tenantContext = tenantContext;
        _tursoSync = tursoSync;
    }

    private (DateTime start, DateTime end) ParseDateRange(string range, DateTime? customStart, DateTime? customEnd)
    {
        var now = DateTime.UtcNow;

        return range.ToLower() switch
        {
            "today" => (now.Date, now.Date.AddDays(1).AddTicks(-1)),
            "yesterday" => (now.Date.AddDays(-1), now.Date.AddTicks(-1)),
            "week" => (now.Date.AddDays(-(int)now.DayOfWeek), now.Date.AddDays(1).AddTicks(-1)),
            "last_month" => (new DateTime(now.Year, now.Month, 1).AddMonths(-1), new DateTime(now.Year, now.Month, 1).AddTicks(-1)),
            "year" => (new DateTime(now.Year, 1, 1), new DateTime(now.Year, 12, 31, 23, 59, 59)),
            "custom" when customStart.HasValue && customEnd.HasValue => (customStart.Value.Date, customEnd.Value.Date.AddDays(1).AddTicks(-1)),
            _ => (new DateTime(now.Year, now.Month, 1), now.Date.AddDays(1).AddTicks(-1)) // default: "month"
        };
    }

    public async Task<ApiResponse<RevenueReportDto>> GetRevenueReportAsync(string range = "month", DateTime? startDate = null, DateTime? endDate = null)
    {
        var (start, end) = ParseDateRange(range, startDate, endDate);

        var payments = await _db.Payments
            .Where(p => p.PaymentDate >= start && p.PaymentDate <= end && p.PaymentStatus == PaymentStatus.Paid)
            .ToListAsync();

        decimal bookingRevenue = payments.Sum(p => p.Amount);

        var orders = await _db.Orders
            .Where(o => o.CreatedAt >= start && o.CreatedAt <= end && (o.Status == OrderStatus.Completed || o.Status == OrderStatus.Served || o.Status == OrderStatus.New || o.Status == OrderStatus.Preparing || o.Status == OrderStatus.Ready))
            .ToListAsync();

        decimal restaurantRevenue = orders.Sum(o => o.TotalAmount);
        decimal totalRevenue = bookingRevenue + restaurantRevenue;

        var breakdown = new List<RevenueCategoryItemDto>();
        if (totalRevenue > 0)
        {
            breakdown.Add(new RevenueCategoryItemDto("Room Bookings", bookingRevenue, (double)Math.Round(bookingRevenue / totalRevenue * 100, 2)));
            breakdown.Add(new RevenueCategoryItemDto("Restaurant & Orders", restaurantRevenue, (double)Math.Round(restaurantRevenue / totalRevenue * 100, 2)));
        }

        return ApiResponse<RevenueReportDto>.Ok(new RevenueReportDto(
            start, end, totalRevenue, bookingRevenue, restaurantRevenue, 0, payments.Count + orders.Count, breakdown
        ));
    }

    public async Task<ApiResponse<ExpenseReportDto>> GetExpenseReportAsync(string range = "month", DateTime? startDate = null, DateTime? endDate = null)
    {
        var (start, end) = ParseDateRange(range, startDate, endDate);

        var expenses = await _db.Expenses
            .Where(e => e.ExpenseDate >= start && e.ExpenseDate <= end)
            .OrderByDescending(e => e.ExpenseDate)
            .ToListAsync();

        decimal totalExpenses = expenses.Sum(e => e.Amount);
        decimal salaryExpenses = expenses.Where(e => e.Category.ToLower().Contains("salary")).Sum(e => e.Amount);
        decimal operationalExpenses = totalExpenses - salaryExpenses;

        var categoryGroups = expenses.GroupBy(e => string.IsNullOrWhiteSpace(e.Category) ? "General" : e.Category)
            .Select(g => new ExpenseCategoryItemDto(
                g.Key,
                g.Sum(x => x.Amount),
                totalExpenses > 0 ? (double)Math.Round(g.Sum(x => x.Amount) / totalExpenses * 100, 2) : 0
            )).ToList();

        var dtos = expenses.Select(e => new ExpenseDto(
            e.Id, e.HotelId, e.Category, e.Amount, e.Description, e.ExpenseDate, e.PaymentMethod, e.ReferenceNumber, e.CreatedBy, e.ReceiptUrl, e.CreatedAt
        )).ToList();

        return ApiResponse<ExpenseReportDto>.Ok(new ExpenseReportDto(
            start, end, totalExpenses, salaryExpenses, operationalExpenses, expenses.Count, categoryGroups, dtos
        ));
    }

    public async Task<ApiResponse<ProfitLossReportDto>> GetProfitLossReportAsync(string range = "month", DateTime? startDate = null, DateTime? endDate = null)
    {
        var (start, end) = ParseDateRange(range, startDate, endDate);

        var revResult = await GetRevenueReportAsync(range, startDate, endDate);
        var expResult = await GetExpenseReportAsync(range, startDate, endDate);

        decimal totalRevenue = revResult.Data?.TotalRevenue ?? 0;
        decimal roomRevenue = revResult.Data?.RoomRevenue ?? 0;
        decimal restaurantRevenue = revResult.Data?.RestaurantRevenue ?? 0;

        decimal totalExpenses = expResult.Data?.TotalExpenses ?? 0;
        decimal salaryExpenses = expResult.Data?.SalaryExpenses ?? 0;
        decimal operationalExpenses = expResult.Data?.OperationalExpenses ?? 0;

        decimal netProfit = totalRevenue - totalExpenses;
        double marginPercentage = totalRevenue > 0 ? (double)Math.Round(netProfit / totalRevenue * 100, 2) : 0;

        return ApiResponse<ProfitLossReportDto>.Ok(new ProfitLossReportDto(
            start, end, totalRevenue, roomRevenue, restaurantRevenue, totalExpenses, salaryExpenses, operationalExpenses, netProfit, marginPercentage
        ));
    }

    public async Task<ApiResponse<OccupancyReportDto>> GetOccupancyReportAsync(string range = "month", DateTime? startDate = null, DateTime? endDate = null)
    {
        var (start, end) = ParseDateRange(range, startDate, endDate);

        var rooms = await _db.Rooms.ToListAsync();
        int totalRooms = rooms.Count;
        int occupiedRooms = rooms.Count(r => r.Status == RoomStatus.Occupied);
        int reservedRooms = rooms.Count(r => r.Status == RoomStatus.Reserved);
        int availableRooms = rooms.Count(r => r.Status == RoomStatus.Available);
        int maintenanceRooms = rooms.Count(r => r.Status == RoomStatus.Maintenance || r.Status == RoomStatus.OutOfOrder || r.Status == RoomStatus.Cleaning);

        double occupancyRate = totalRooms > 0 ? Math.Round((double)(occupiedRooms + reservedRooms) / totalRooms * 100, 2) : 0;

        var reservations = await _db.Reservations
            .Where(r => r.CheckInDate <= end && r.CheckOutDate >= start && r.BookingStatus != BookingStatus.Cancelled)
            .ToListAsync();

        decimal totalBookingRev = reservations.Sum(r => r.TotalAmount);
        int totalNights = Math.Max(1, (int)(end - start).TotalDays);

        decimal adr = reservations.Count > 0 ? Math.Round(totalBookingRev / reservations.Count, 2) : 0;
        decimal revPar = totalRooms > 0 ? Math.Round(totalBookingRev / (totalRooms * totalNights), 2) : 0;

        return ApiResponse<OccupancyReportDto>.Ok(new OccupancyReportDto(
            start, end, totalRooms, occupiedRooms, reservedRooms, availableRooms, maintenanceRooms, occupancyRate, adr, revPar
        ));
    }

    public async Task<ApiResponse<BookingReportDto>> GetBookingReportAsync(string range = "month", DateTime? startDate = null, DateTime? endDate = null)
    {
        var (start, end) = ParseDateRange(range, startDate, endDate);

        var bookings = await _db.Reservations
            .Where(r => r.CreatedAt >= start && r.CreatedAt <= end)
            .ToListAsync();

        int total = bookings.Count;
        int confirmed = bookings.Count(b => b.BookingStatus == BookingStatus.Confirmed);
        int checkedIn = bookings.Count(b => b.BookingStatus == BookingStatus.CheckedIn);
        int checkedOut = bookings.Count(b => b.BookingStatus == BookingStatus.CheckedOut);
        int cancelled = bookings.Count(b => b.BookingStatus == BookingStatus.Cancelled);

        decimal totalValue = bookings.Where(b => b.BookingStatus != BookingStatus.Cancelled).Sum(b => b.TotalAmount);
        decimal collected = bookings.Where(b => b.BookingStatus != BookingStatus.Cancelled).Sum(b => b.PaidAmount);
        decimal pending = bookings.Where(b => b.BookingStatus != BookingStatus.Cancelled).Sum(b => b.DueAmount);

        return ApiResponse<BookingReportDto>.Ok(new BookingReportDto(
            start, end, total, confirmed, checkedIn, checkedOut, cancelled, totalValue, collected, pending
        ));
    }

    public async Task<ApiResponse<RestaurantReportDto>> GetRestaurantReportAsync(string range = "month", DateTime? startDate = null, DateTime? endDate = null)
    {
        var (start, end) = ParseDateRange(range, startDate, endDate);

        var orders = await _db.Orders
            .Where(o => o.CreatedAt >= start && o.CreatedAt <= end && o.Status != OrderStatus.Cancelled)
            .ToListAsync();

        int totalOrders = orders.Count;
        int dineIn = orders.Count(o => o.OrderType == OrderType.DineIn);
        int roomService = orders.Count(o => o.OrderType == OrderType.RoomService);
        int takeaway = orders.Count(o => o.OrderType == OrderType.Takeaway);

        decimal totalSales = orders.Sum(o => o.TotalAmount);
        decimal avgOrderVal = totalOrders > 0 ? Math.Round(totalSales / totalOrders, 2) : 0;

        return ApiResponse<RestaurantReportDto>.Ok(new RestaurantReportDto(
            start, end, totalOrders, dineIn, roomService, takeaway, totalSales, avgOrderVal
        ));
    }

    public async Task<ApiResponse<StaffReportDto>> GetStaffReportAsync(string range = "month", DateTime? startDate = null, DateTime? endDate = null)
    {
        var (start, end) = ParseDateRange(range, startDate, endDate);

        try
        {
            var tursoStaff = await _tursoSync.FetchStaffFromTursoAsync();
            if (tursoStaff != null && tursoStaff.Count > 0)
            {
                var existingLocal = await _db.Staffs.ToListAsync();
                var tursoIds = tursoStaff.Select(ts => ts.Id).ToHashSet();

                var toRemove = existingLocal.Where(s => !tursoIds.Contains(s.Id)).ToList();
                if (toRemove.Count > 0)
                {
                    _db.Staffs.RemoveRange(toRemove);
                    await _db.SaveChangesAsync();
                }

                foreach (var ts in tursoStaff)
                {
                    var match = existingLocal.FirstOrDefault(s => s.Id == ts.Id);
                    if (match == null)
                    {
                        _db.Staffs.Add(new Domain.Entities.Staff
                        {
                            Id = ts.Id,
                            HotelId = ts.HotelId,
                            FirstName = ts.FirstName,
                            LastName = ts.LastName,
                            FullName = ts.FullName,
                            Mobile = ts.Mobile,
                            Email = ts.Email,
                            Address = ts.Address,
                            Role = ts.Role,
                            Department = ts.Department,
                            JoiningDate = ts.JoiningDate,
                            Salary = ts.Salary,
                            Status = ts.Status,
                            CreatedAt = ts.CreatedAt
                        });
                    }
                    else
                    {
                        match.FirstName = ts.FirstName;
                        match.LastName = ts.LastName;
                        match.FullName = ts.FullName;
                        match.Mobile = ts.Mobile;
                        match.Email = ts.Email;
                        match.Address = ts.Address;
                        match.Role = ts.Role;
                        match.Department = ts.Department;
                        match.Salary = ts.Salary;
                        match.Status = ts.Status;
                    }
                }
                await _db.SaveChangesAsync();
            }
        }
        catch { }

        var staffList = await _db.Staffs.ToListAsync();
        int totalStaff = staffList.Count;
        int activeStaff = staffList.Count(s => s.Status == "Active");
        decimal totalSalaryExpense = staffList.Where(s => s.Status == "Active").Sum(s => s.Salary);

        var todayDate = DateTime.UtcNow.Date;
        var todayAttendances = await _db.StaffAttendances.Where(a => a.AttendanceDate.Date == todayDate).ToListAsync();

        int present = todayAttendances.Count(a => a.Status == AttendanceStatus.Present || a.Status == AttendanceStatus.HalfDay);
        int absent = todayAttendances.Count(a => a.Status == AttendanceStatus.Absent);
        int leave = todayAttendances.Count(a => a.Status == AttendanceStatus.Leave);

        return ApiResponse<StaffReportDto>.Ok(new StaffReportDto(
            start, end, totalStaff, activeStaff, present, absent, leave, totalSalaryExpense
        ));
    }
}
