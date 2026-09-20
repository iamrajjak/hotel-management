$dllPath = "E:\project\Hotel-Management\backend\HotelSaaS.Api\bin\Debug\net9.0\Microsoft.Data.Sqlite.dll"
[System.Reflection.Assembly]::LoadFrom($dllPath) | Out-Null

$dbPath = "E:\project\Hotel-Management\backend\HotelSaaS.Api\hotelsaas.db"
$connStr = "Data Source=$dbPath"
$conn = New-Object Microsoft.Data.Sqlite.SqliteConnection($connStr)
$conn.Open()

$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT Id, Name, Status FROM Hotels;"
$reader = $cmd.ExecuteReader()

Write-Host "=== HOTELS IN LOCAL HOTELSAAS.DB ==="
$count = 0
while ($reader.Read()) {
    $count++
    Write-Host ($reader.GetString(0) + " | " + $reader.GetString(1) + " | " + $reader.GetString(2))
}
if ($count -eq 0) {
    Write-Host "NO ROWS FOUND IN LOCAL HOTELSAAS.DB FOR Hotels!"
}

$conn.Close()
