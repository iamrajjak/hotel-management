namespace HotelSaaS.Domain.Enums;

public enum RoomStatus
{
    Available,
    Reserved,
    Occupied,
    Cleaning,
    Maintenance,
    OutOfOrder
}

public enum BookingStatus
{
    Pending,
    Confirmed,
    CheckedIn,
    CheckedOut,
    Cancelled,
    NoShow
}

public enum PaymentStatus
{
    Pending,
    Paid,
    Partial,
    Refunded,
    Failed
}

public enum PaymentMethod
{
    Cash,
    UPI,
    Card,
    BankTransfer,
    Online,
    Other
}

public enum OrderType
{
    DineIn,
    RoomService,
    Takeaway
}

public enum OrderStatus
{
    New,
    Preparing,
    Ready,
    Served,
    Completed,
    Cancelled
}

public enum KotStatus
{
    Pending,
    Preparing,
    Ready,
    Completed,
    Cancelled
}

public enum AttendanceStatus
{
    Present,
    Absent,
    HalfDay,
    Leave
}

public enum TaskType
{
    Cleaning,
    DeepCleaning,
    Inspection,
    Maintenance
}

public enum HousekeepingTaskStatus
{
    Pending,
    InProgress,
    Completed,
    Cancelled
}

public enum EnquiryStatus
{
    New,
    Contacted,
    FollowUp,
    Closed
}

public enum InventoryTransactionType
{
    StockIn,
    StockOut,
    Adjustment,
    Wastage
}

public enum DiscountType
{
    Percentage,
    Fixed
}
