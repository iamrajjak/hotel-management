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
                sql = 'DELETE FROM staffs;'
            }
        },
        @{
            type = 'execute'
            stmt = @{
                sql = "INSERT INTO staffs (id, hotel_id, hotel_code, first_name, last_name, full_name, mobile, email, address, role, department, joining_date, salary, status, created_at) VALUES ('00000000-0000-0000-0009-000000000001', 'hotel-1', 'HTL-001', 'Vikram', 'Singh', 'Vikram Singh', '9876543210', 'vikram@hotel.com', 'Main Market, Jodhpur', 'Senior Front Desk Executive', 'Reception', '2026-03-15T00:00:00Z', 25000, 'Active', '2026-03-15T00:00:00Z');"
            }
        },
        @{
            type = 'execute'
            stmt = @{
                sql = "INSERT INTO staffs (id, hotel_id, hotel_code, first_name, last_name, full_name, mobile, email, address, role, department, joining_date, salary, status, created_at) VALUES ('2051918e-8083-4e69-92b4-c2790a550ae3', 'hotel-1', 'HTL-001', 'Amit', 'Sharma', 'Amit Sharma', '9812345678', 'amit.sharma@hotelsaas.com', 'Sector 14, Udaipur', 'Front Desk Manager', 'Reception', '2026-09-15T22:30:00Z', 32000, 'Active', '2026-09-15T22:30:00Z');"
            }
        }
    )
} | ConvertTo-Json -Depth 10

$res = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body
$res | ConvertTo-Json -Depth 10
