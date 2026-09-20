# PowerShell script to insert Room 201 and Room 202 into local DB and verify all 5 rooms
$headers = @{ "Content-Type" = "application/json" }

Write-Host "=========================================="
Write-Host "1. INSERTING ROOM 201 VIA API"
Write-Host "=========================================="

$room201 = @{
    roomNumber = "201"
    roomTypeName = "Royal Executive Suite"
    price = 5000
    floor = "2nd Floor"
    status = "Available"
} | ConvertTo-Json

try {
    $r1 = Invoke-RestMethod -Uri "http://localhost:5000/api/rooms" -Method Post -Headers $headers -Body $room201
    Write-Host "SUCCESS: Room 201 Inserted!" -ForegroundColor Green
} catch {
    Write-Host "Room 201 Info: $_"
}

Write-Host "`n=========================================="
Write-Host "2. INSERTING ROOM 202 VIA API"
Write-Host "=========================================="

$room202 = @{
    roomNumber = "202"
    roomTypeName = "Royal Executive Suite"
    price = 5000
    floor = "2nd Floor"
    status = "Cleaning"
} | ConvertTo-Json

try {
    $r2 = Invoke-RestMethod -Uri "http://localhost:5000/api/rooms" -Method Post -Headers $headers -Body $room202
    Write-Host "SUCCESS: Room 202 Inserted!" -ForegroundColor Green
} catch {
    Write-Host "Room 202 Info: $_"
}

Write-Host "`n=========================================="
Write-Host "3. FETCHING ALL ROOMS FROM API"
Write-Host "=========================================="
try {
    $allRooms = Invoke-RestMethod -Uri "http://localhost:5000/api/rooms" -Method Get
    Write-Host "TOTAL ROOMS IN DATABASE: $($allRooms.data.Count)" -ForegroundColor Yellow
    foreach ($rm in $allRooms.data) {
        Write-Host "  - Room #$($rm.roomNumber) | Type: $($rm.roomTypeName) | Floor: $($rm.floor) | Price: ₹$($rm.price)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "Error GET /api/rooms: $_"
}
