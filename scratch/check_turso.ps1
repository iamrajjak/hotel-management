$token = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODgyODMxNTUsImlkIjoiMDFhMDVkZjktMTUwMS03NGVhLWI4YWItZTYxNDhhZjc0MWUzIiwia2lkIjoibnlKME5mcF9wWkFHVWdBajFIcFFkZFc4VURGYjhyTXhibmp0RXFLXzY1OCIsInJpZCI6ImZkMWE4MDdmLWVhNDMtNDZkZS1hZTBhLTY3Y2ZhMjVmMThjOSJ9.wnrrsSfVKk4p_aXk_YdyHBEbG3J25O_g0IF5-bWaSHie9k3n351cphbtnivUsBVx7Of7h9dt_6gDc1abxAw2Bg'
$url = 'https://hotelproject-iamrajjak.aws-ap-south-1.turso.io/v2/pipeline'

$headers = @{
    'Authorization' = "Bearer $token"
    'Content-Type'  = 'application/json'
}

$body = @{
    requests = @(
        @{
            type = 'execute'
            stmt = @{
                sql = 'SELECT id, full_name, mobile, email, role, department, salary, status FROM staffs;'
            }
        }
    )
} | ConvertTo-Json -Depth 10

$res = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body
$res | ConvertTo-Json -Depth 10
