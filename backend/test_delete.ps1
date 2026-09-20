# PowerShell script to test DELETE /api/rooms/{id}
Write-Host "1. FETCHING CURRENT ROOMS"
$rooms = Invoke-RestMethod -Uri "http://localhost:5000/api/rooms" -Method Get
Write-Host "Current Rooms Count: $($rooms.data.Count)" -ForegroundColor Yellow

if ($rooms.data.Count -gt 0) {
    $target = $rooms.data[0]
    Write-Host "`n2. DELETING ROOM #$($target.roomNumber) (ID: $($target.id))" -ForegroundColor Cyan
    try {
        $delRes = Invoke-RestMethod -Uri "http://localhost:5000/api/rooms/$($target.id)" -Method Delete
        Write-Host "SUCCESS: Room Deleted!" -ForegroundColor Green
        Write-Host ($delRes | ConvertTo-Json)
        
        $after = Invoke-RestMethod -Uri "http://localhost:5000/api/rooms" -Method Get
        Write-Host "`n3. ROOMS COUNT AFTER DELETE: $($after.data.Count)" -ForegroundColor Yellow
    } catch {
        Write-Host "Delete Error: $_" -ForegroundColor Red
    }
}
