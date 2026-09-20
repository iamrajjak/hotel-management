$token = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODgyODMxNTUsImlkIjoiMDFhMDVkZjktMTUwMS03NGVhLWI4YWItZTYxNDhhZjc0MWUzIiwia2lkIjoibnlKME5mcF9wWkFHVWdBajFIcFFkZFc4VURGYjhyTXhibmp0RXFLXzY1OCIsInJpZCI6ImZkMWE4MDdmLWVhNDMtNDZkZS1hZTBhLTY3Y2ZhMjVmMThjOSJ9.wnrrsSfVKk4p_aXk_YdyHBEbG3J25O_g0IF5-bWaSHie9k3n351cphbtnivUsBVx7Of7h9dt_6gDc1abxAw2Bg"
$url = "https://hotelproject-iamrajjak.aws-ap-south-1.turso.io/v2/pipeline"

$payload = @{
    requests = @(
        @{ type = "execute"; stmt = @{ sql = "SELECT id, name, status FROM hotels;" } },
        @{ type = "execute"; stmt = @{ sql = "SELECT Id, FullName, Email FROM Profiles;" } },
        @{ type = "execute"; stmt = @{ sql = "SELECT id, full_name, role FROM staffs;" } },
        @{ type = "execute"; stmt = @{ sql = "SELECT id, room_number, status FROM rooms;" } }
    )
} | ConvertTo-Json -Depth 10

$response = Invoke-RestMethod -Uri $url -Method Post -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body $payload
$response | ConvertTo-Json -Depth 10
