$baseUrl = "http://localhost:5000/api"

Write-Host "=== Testing Database Standardization & Audit Logs ===" -ForegroundColor Cyan

# 1. Create a Test Reservation
$body = @{
    customerName = "Standardization Test Guest"
    customerPhone = "+91 9988112233"
    customerEmail = "stdtest@example.com"
    roomNumber = "202"
    checkInDate = (Get-Date).ToString("yyyy-MM-dd")
    checkOutDate = (Get-Date).AddDays(2).ToString("yyyy-MM-dd")
    adults = 2
    children = 0
    baseAmount = 6000
    paidAmount = 6000
    paymentMethod = "UPI"
    bookingStatus = "Confirmed"
} | ConvertTo-Json

try {
    $res = Invoke-RestMethod -Uri "$baseUrl/reservations" -Method Post -Body $body -ContentType "application/json"
    Write-Host "[SUCCESS] Reservation Created!" -ForegroundColor Green
    Write-Host "Booking Number: $($res.data.bookingNumber)" -ForegroundColor Yellow
    Write-Host "ID: $($res.data.id)" -ForegroundColor Yellow
    Write-Host "Created At: $($res.data.createdAt)" -ForegroundColor Yellow
} catch {
    Write-Host "[ERROR] Failed to create reservation: $_" -ForegroundColor Red
}

# 2. Fetch Audit Logs
try {
    $logs = Invoke-RestMethod -Uri "$baseUrl/audit-logs?limit=5" -Method Get
    Write-Host "`n[SUCCESS] Retrieved Audit Logs!" -ForegroundColor Green
    $logs.data | ForEach-Object {
        Write-Host "Log Action: $($_.action) | Entity: $($_.entity) | CreatedAt: $($_.createdAt)" -ForegroundColor Gray
    }
} catch {
    Write-Host "[ERROR] Failed to fetch audit logs: $_" -ForegroundColor Red
}
