$dbPath = "E:\project\Hotel-Management\backend\HotelSaaS.Api\hotelsaas.db"
if (Test-Path $dbPath) {
    Remove-Item -Path $dbPath -Force
    Write-Host "Removed local SQLite file hotelsaas.db"
}
