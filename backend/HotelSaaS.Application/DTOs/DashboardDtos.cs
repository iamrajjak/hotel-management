namespace HotelSaaS.Application.DTOs;

public record OwnerDashboardDto(
    decimal TotalRevenue,
    decimal MonthlyRevenue,
    decimal TotalExpenses,
    decimal NetProfit,
    double OccupancyPercentage,
    decimal PendingPaymentsAmount,
    int PendingPaymentsCount,
    int PendingKotCount,
    List<ReservationDto> RecentBookings,
    List<RestaurantOrderDto> RecentOrders,
    List<ExpenseDto> RecentExpenses
);

public record StaffManagerDashboardDto(
    int TotalRooms,
    int AvailableRooms,
    int OccupiedRooms,
    int ReservedRooms,
    double OccupancyPercentage,
    int TodayCheckIns,
    int TodayCheckOuts,
    int PendingPaymentsCount,
    int PendingKotCount,
    List<ReservationDto> RecentBookings,
    List<RestaurantOrderDto> RecentOrders
);
