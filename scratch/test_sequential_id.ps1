$baseUrl = "http://localhost:5000/api"

Write-Host "=== Testing Sequential Booking IDs & String Enum Serialization ===" -ForegroundColor Cyan

# 1. Create a Test Reservation
$body = @{
    customerName = "Sequential Test Guest"
    customerPhone = "+91 9876543210"
    customerEmail = "seqtest@example.com"
    roomNumber = "203"
    checkInDate = (Get-Date).ToString("yyyy-MM-dd")
    checkOutDate = (Get-Date).AddDays(2).ToString("yyyy-MM-dd")
    adults = 2
    children = 0
    baseAmount = 7500
    paidAmount = 7500
    paymentMethod = "Cash"
    bookingStatus = "Confirmed"
} | ConvertTo-Json

try {
    $res = Invoke-RestMethod -Uri "$baseUrl/reservations" -Method Post -Body $body -ContentType "application/json"
    Write-Host "[SUCCESS] Reservation Created!" -ForegroundColor Green
    Write-Host "Booking Number: $($res.data.bookingNumber)" -ForegroundColor Yellow
    Write-Host "Booking Status: $($res.data.bookingStatus)" -ForegroundColor Yellow
    Write-Host "Payment Status: $($res.data.paymentStatus)" -ForegroundColor Yellow
} catch {
    Write-Host "[ERROR] Failed to create reservation: $_" -ForegroundColor Red
}
