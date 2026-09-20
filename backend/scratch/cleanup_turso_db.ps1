$token = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODgyODMxNTUsImlkIjoiMDFhMDVkZjktMTUwMS03NGVhLWI4YWItZTYxNDhhZjc0MWUzIiwia2lkIjoibnlKME5mcF9wWkFHVWdBajFIcFFkZFc4VURGYjhyTXhibmp0RXFLXzY1OCIsInJpZCI6ImZkMWE4MDdmLWVhNDMtNDZkZS1hZTBhLTY3Y2ZhMjVmMThjOSJ9.wnrrsSfVKk4p_aXk_YdyHBEbG3J25O_g0IF5-bWaSHie9k3n351cphbtnivUsBVx7Of7h9dt_6gDc1abxAw2Bg"
$url = "https://hotelproject-iamrajjak.aws-ap-south-1.turso.io/v2/pipeline"

$sqlStatements = @(
    # 1. Clean orphaned hotel-8 / old test hotels from Turso Cloud DB
    "DELETE FROM hotels WHERE id = 'hotel-8' OR name = 'rajjak' OR id NOT LIKE 'hotel-%';",
    "DELETE FROM Hotels WHERE Id = 'hotel-8' OR Name = 'rajjak' OR Id NOT LIKE 'hotel-%';",
    
    # 2. Select remaining hotels to verify
    "SELECT id, name, status FROM hotels;"
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
