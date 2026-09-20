# PowerShell script to insert Rooms directly into SQLite database
Add-Type -AssemblyName System.Data

$dbPath = "E:\project\Hotel-Management\backend\HotelSaaS.Api\hotelsaas.db"
Write-Host "Database file location: $dbPath"
