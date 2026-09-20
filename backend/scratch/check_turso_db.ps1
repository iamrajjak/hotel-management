$tursoUrl = "https://hotelproject-iamrajjak.aws-ap-south-1.turso.io/v2/pipeline"
$authToken = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODgyODMxNTUsImlkIjoiMDFhMDVkZjktMTUwMS03NGVhLWI4YWItZTYxNDhhZjc0MWUzIiwia2lkIjoibnlKME5mcF9wWkFHVWdBajFIcFFkZFc4VURGYjhyTXhibmp0RXFLXzY1OCIsInJpZCI6ImZkMWE4MDdmLWVhNDMtNDZkZS1hZTBhLTY3Y2ZhMjVmMThjOSJ9.wnrrsSfVKk4p_aXk_YdyHBEbG3J25O_g0IF5-bWaSHie9k3n351cphbtnivUsBVx7Of7h9dt_6gDc1abxAw2Bg"

function Query-Turso($sql) {
    $req = @{
        requests = @(
            @{
                type = "execute"
                stmt = @{ sql = $sql }
            }
        )
    } | ConvertTo-Json -Depth 5

    $res = Invoke-RestMethod -Uri $tursoUrl -Method Post -Headers @{ Authorization = "Bearer $authToken" } -ContentType "application/json" -Body $req
    return $res.results[0].response.result
}

Write-Host "--- HOTELS ON TURSO ---"
$hotels = Query-Turso "SELECT * FROM hotels;"
$hotels | ConvertTo-Json -Depth 4

Write-Host "--- ROOM TYPES ON TURSO ---"
$types = Query-Turso "SELECT * FROM room_types;"
$types | ConvertTo-Json -Depth 4

Write-Host "--- ROOMS ON TURSO ---"
$rooms = Query-Turso "SELECT * FROM rooms;"
$rooms | ConvertTo-Json -Depth 4
