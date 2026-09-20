$token = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODgyODMxNTUsImlkIjoiMDFhMDVkZjktMTUwMS03NGVhLWI4YWItZTYxNDhhZjc0MWUzIiwia2lkIjoibnlKME5mcF9wWkFHVWdBajFIcFFkZFc4VURGYjhyTXhibmp0RXFLXzY1OCIsInJpZCI6ImZkMWE4MDdmLWVhNDMtNDZkZS1hZTBhLTY3Y2ZhMjVmMThjOSJ9.wnrrsSfVKk4p_aXk_YdyHBEbG3J25O_g0IF5-bWaSHie9k3n351cphbtnivUsBVx7Of7h9dt_6gDc1abxAw2Bg"
$url = "https://hotelproject-iamrajjak.aws-ap-south-1.turso.io/v2/pipeline"

$sqlStatements = @(
    # 1. Update trainid in staffs table to incrementing integer (starting from 1)
    "UPDATE staffs SET trainid = 1 WHERE id = 'staff-1' OR trainid = 0 OR trainid IS NULL;",
    
    # 2. Select staffs to verify trainid
    "SELECT id, trainid, hotel_id, first_name, last_name, full_name, mobile, role FROM staffs;"
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
