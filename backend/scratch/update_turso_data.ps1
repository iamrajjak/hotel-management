$token = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODgyODMxNTUsImlkIjoiMDFhMDVkZjktMTUwMS03NGVhLWI4YWItZTYxNDhhZjc0MWUzIiwia2lkIjoibnlKME5mcF9wWkFHVWdBajFIcFFkZFc4VURGYjhyTXhibmp0RXFLXzY1OCIsInJpZCI6ImZkMWE4MDdmLWVhNDMtNDZkZS1hZTBhLTY3Y2ZhMjVmMThjOSJ9.wnrrsSfVKk4p_aXk_YdyHBEbG3J25O_g0IF5-bWaSHie9k3n351cphbtnivUsBVx7Of7h9dt_6gDc1abxAw2Bg"
$url = "https://hotelproject-iamrajjak.aws-ap-south-1.turso.io/v2/pipeline"

$sqlStatements = @(
    # 1. Replace GUID staff id with clean readable 'staff-1'
    "DELETE FROM staffs WHERE id = 'fce52461-6dc4-465c-8ed7-ab3c10f60908';",
    "INSERT INTO staffs (id, hotel_id, first_name, last_name, full_name, mobile, email, address, role, department, joining_date, salary, status, created_at) VALUES ('staff-1', 'hotel-1', 'RAJJAK', 'KHAN', 'RAJJAK KHAN', '9784306040', 'rajjakkhan5453@gmail.com', '', 'Front Desk Executive', 'General', '2026-09-15T17:42:45.5807768Z', 15000, 'Active', '2026-09-15T17:42:45.5807768Z') ON CONFLICT(id) DO UPDATE SET hotel_id = 'hotel-1', full_name = 'RAJJAK KHAN';",
    
    # 2. Select staff data to verify
    "SELECT id, hotel_id, first_name, last_name, full_name, mobile, role FROM staffs;"
)

$requests = @()
foreach ($sql in $sqlStatements) {
    $requests += @{
        type = "execute"
        stmt = @{ sql = $sql }
    }
}

$payload = @{ requests = $requests } | ConvertTo-Json -Depth 10

$response = Invoke-RestMethod -Uri $url -Method Post -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body $payload
$response | ConvertTo-Json -Depth 10
