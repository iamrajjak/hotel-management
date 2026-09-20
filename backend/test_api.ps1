# PowerShell script to test POST /api/reservations
$headers = @{ "Content-Type" = "application/json" }

Write-Host "TESTING POST /api/reservations"

$resBody = @{
    customerName = "RAJJAK KHAN"
    customerEmail = "rajjak@example.com"
    customerPhone = "9784306040"
    roomNumber = "301"
    checkInDate = "2026-09-02T00:00:00Z"
    checkOutDate = "2026-09-05T00:00:00Z"
    adults = 2
    children = 0
    baseAmount = 13500
    discountAmount = 0
    taxAmount = 0
    bookingSource = "Direct API Hit Test"
} | ConvertTo-Json

try {
    $res2 = Invoke-RestMethod -Uri "http://localhost:5000/api/reservations" -Method Post -Headers $headers -Body $resBody
    Write-Host "SUCCESS: Reservation Created!" -ForegroundColor Green
    Write-Host ($res2 | ConvertTo-Json -Depth 5)
} catch {
    $streamReader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
    $errJson = $streamReader.ReadToEnd()
    Write-Host "500 ERROR DETAILS:" -ForegroundColor Red
    Write-Host $errJson
}
