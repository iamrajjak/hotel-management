$bodyRegister = @{
    HotelName = "Test Hotel 4"
    OwnerFullName = "Owner Four"
    OwnerEmail = "owner4@testhotel.com"
    OwnerPassword = "Password123"
    Phone = "+91 9988776611"
} | ConvertTo-Json

Write-Host "1. Registering new Hotel..."
try {
    $regRes = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register-hotel" -Method Post -ContentType "application/json" -Body $bodyRegister
    Write-Host "Register Response:" ($regRes | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "Hotel registration exception (might already exist):" $_.Exception.Message
}

Write-Host "2. Admin Logging in to approve..."
$bodyAdmin = @{
    Email = "admin@hotelsaas.com"
    Password = "Admin@123"
} | ConvertTo-Json
$adminLogin = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method Post -ContentType "application/json" -Body $bodyAdmin
$adminToken = $adminLogin.data.token

Write-Host "3. Approving Hotel..."
$pendingHotels = Invoke-RestMethod -Uri "http://localhost:5000/api/hotels/pending-approvals" -Method Get -Headers @{ Authorization = "Bearer $adminToken" }
Write-Host "Pending Hotels Count:" $pendingHotels.data.Count
foreach ($h in $pendingHotels.data) {
    if ($h.name -eq "Test Hotel 4") {
        $appRes = Invoke-RestMethod -Uri "http://localhost:5000/api/hotels/$($h.id)/approve" -Method Post -Headers @{ Authorization = "Bearer $adminToken" }
        Write-Host "Approved Test Hotel 4:" ($appRes | ConvertTo-Json)
    }
}

Write-Host "4. Logging in as Owner Four..."
$bodyOwner = @{
    Email = "owner4@testhotel.com"
    Password = "Password123"
} | ConvertTo-Json
$ownerLogin = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method Post -ContentType "application/json" -Body $bodyOwner
Write-Host "Owner Login Successful. Token obtained."
$ownerToken = $ownerLogin.data.token
$ownerHotelId = $ownerLogin.data.hotelId
Write-Host "Owner Hotel ID:" $ownerHotelId

Write-Host "5. Creating Room 101 for Test Hotel 4..."
$bodyRoom = @{
    RoomNumber = "101"
    RoomTypeName = "Deluxe Queen Room"
    Floor = "1st Floor"
    Price = 6500
    Status = "Available"
} | ConvertTo-Json

$roomRes = Invoke-RestMethod -Uri "http://localhost:5000/api/rooms" -Method Post -Headers @{ Authorization = "Bearer $ownerToken" } -ContentType "application/json" -Body $bodyRoom
Write-Host "Room Creation Result:" ($roomRes | ConvertTo-Json -Depth 4)

Write-Host "6. Fetching Rooms for Test Hotel 4..."
$getRooms = Invoke-RestMethod -Uri "http://localhost:5000/api/rooms" -Method Get -Headers @{ Authorization = "Bearer $ownerToken" }
Write-Host "Fetched Rooms for Test Hotel 4:" ($getRooms | ConvertTo-Json -Depth 4)

Write-Host "7. Fetching Rooms for Grand Palace (hotel-001)..."
$bodyGrandOwner = @{
    Email = "owner@grandpalace.com"
    Password = "Owner@123"
} | ConvertTo-Json
$grandLogin = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method Post -ContentType "application/json" -Body $bodyGrandOwner
$grandToken = $grandLogin.data.token
$getGrandRooms = Invoke-RestMethod -Uri "http://localhost:5000/api/rooms" -Method Get -Headers @{ Authorization = "Bearer $grandToken" }
Write-Host "Grand Palace Rooms Count:" $getGrandRooms.data.Count
