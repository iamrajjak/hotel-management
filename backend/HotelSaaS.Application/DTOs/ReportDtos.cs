namespace HotelSaaS.Application.DTOs;

public record RevenueCategoryItemDto(
    string Category,
    decimal Amount,
    double Percentage
);

public record RevenueReportDto(
    DateTime StartDate,
    DateTime EndDate,
    decimal TotalRevenue,
    decimal RoomRevenue,
    decimal RestaurantRevenue,
    decimal OtherRevenue,
    int TotalTransactions,
    List<RevenueCategoryItemDto> Breakdown
);

public record ExpenseCategoryItemDto(
    string Category,
    decimal Amount,
    double Percentage
);

public record ExpenseReportDto(
    DateTime StartDate,
    DateTime EndDate,
    decimal TotalExpenses,
    decimal SalaryExpenses,
    decimal OperationalExpenses,
    int TotalExpenseItems,
    List<ExpenseCategoryItemDto> CategoryBreakdown,
    List<ExpenseDto> Expenses
);

public record ProfitLossReportDto(
    DateTime StartDate,
    DateTime EndDate,
    decimal TotalRevenue,
    decimal RoomRevenue,
    decimal RestaurantRevenue,
    decimal TotalExpenses,
    decimal SalaryExpenses,
    decimal OperationalExpenses,
    decimal NetProfit,
    double ProfitMarginPercentage
);

public record OccupancyReportDto(
    DateTime StartDate,
    DateTime EndDate,
    int TotalRooms,
    int OccupiedRooms,
    int ReservedRooms,
    int AvailableRooms,
    int MaintenanceRooms,
    double OccupancyRatePercentage,
    decimal AverageDailyRate,
    decimal RevPar // Revenue Per Available Room
);

public record BookingReportDto(
    DateTime StartDate,
    DateTime EndDate,
    int TotalBookings,
    int ConfirmedBookings,
    int CheckedInBookings,
    int CheckedOutBookings,
    int CancelledBookings,
    decimal TotalBookingValue,
    decimal TotalCollected,
    decimal TotalPending
);

public record RestaurantReportDto(
    DateTime StartDate,
    DateTime EndDate,
    int TotalOrders,
    int DineInOrders,
    int RoomServiceOrders,
    int TakeawayOrders,
    decimal TotalRestaurantSales,
    decimal AverageOrderValue
);

public record StaffReportDto(
    DateTime StartDate,
    DateTime EndDate,
    int TotalStaff,
    int ActiveStaff,
    int PresentToday,
    int AbsentToday,
    int LeaveToday,
    decimal TotalMonthlySalaryExpense
);
