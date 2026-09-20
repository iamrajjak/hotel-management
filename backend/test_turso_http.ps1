# Script to directly query and insert into Turso Cloud Database via HTTP Pipeline API
$token = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODgyODMxNTUsImlkIjoiMDFhMDVkZjktMTUwMS03NGVhLWI4YWItZTYxNDhhZjc0MWUzIiwia2lkIjoibnlKME5mcF9wWkFHVWdBajFIcFFkZFc4VURGYjhyTXhibmp0RXFLXzY1OCIsInJpZCI6ImZkMWE4MDdmLWVhNDMtNDZkZS1hZTBhLTY3Y2ZhMjVmMThjOSJ9.wnrrsSfVKk4p_aXk_YdyHBEbG3J25O_g0IF5-bWaSHie9k3n351cphbtnivUsBVx7Of7h9dt_6gDc1abxAw2Bg"
$url = "https://hotelproject-iamrajjak.aws-ap-south-1.turso.io/v2/pipeline"

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/json"
}

# 1. Execute SQL Statements on Turso Cloud Database
$body = @{
    requests = @(
        @{ type = "execute"; stmt = @{ sql = "INSERT OR IGNORE INTO hotels (id, name, slug, phone, email, address, city, state, country, pincode, status) VALUES ('hotel-royal-01', 'Royal Stay Hotels & Resorts', 'royal-stay', '+91 98765 43210', 'info@royalstay.com', '123 Beach Road', 'Goa', 'Goa', 'India', '403001', 'Active');" } },
        @{ type = "execute"; stmt = @{ sql = "INSERT OR IGNORE INTO room_types (id, hotel_id, name, slug, base_price, max_adults, bed_type, status) VALUES ('rt-deluxe-01', 'hotel-royal-01', 'Deluxe Queen Room', 'deluxe-queen-room', 4500, 2, 'King Bed', 'Active');" } },
        @{ type = "execute"; stmt = @{ sql = "INSERT OR IGNORE INTO rooms (id, hotel_id, room_type_id, room_number, floor, price, status, notes) VALUES ('r-301', 'hotel-royal-01', 'rt-deluxe-01', '301', '3rd Floor', 4500, 'Available', 'Pool View');" } },
        @{ type = "execute"; stmt = @{ sql = "INSERT OR IGNORE INTO customers (id, hotel_id, full_name, email, phone) VALUES ('c-rajjak-01', 'hotel-royal-01', 'RAJJAK KHAN', 'rajjakkhan5453@gmail.com', '9784306040');" } },
        @{ type = "execute"; stmt = @{ sql = "INSERT OR IGNORE INTO reservations (id, hotel_id, booking_number, customer_id, room_id, check_in_date, check_out_date, total_amount, paid_amount, payment_status, booking_status, booking_source) VALUES ('res-301', 'hotel-royal-01', 'RES-20260901-3054', 'c-rajjak-01', 'r-301', '2026-09-02', '2026-09-05', 13500, 13500, 'Paid', 'Confirmed', 'Website Direct');" } },
        @{ type = "execute"; stmt = @{ sql = "SELECT COUNT(*) FROM hotels;" } },
        @{ type = "execute"; stmt = @{ sql = "SELECT COUNT(*) FROM room_types;" } },
        @{ type = "execute"; stmt = @{ sql = "SELECT COUNT(*) FROM rooms;" } },
        @{ type = "execute"; stmt = @{ sql = "SELECT COUNT(*) FROM customers;" } },
        @{ type = "execute"; stmt = @{ sql = "SELECT * FROM reservations;" } }
    )
} | ConvertTo-Json -Depth 6

try {
    Write-Host "EXECUTING TURSO CLOUD PIPELINE INSERT & SELECT..." -ForegroundColor Cyan
    $res = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body
    Write-Host "TURSO CLOUD SUCCESS RESPONSE:" -ForegroundColor Green
    Write-Host ($res | ConvertTo-Json -Depth 6)
} catch {
    Write-Host "Turso HTTP Error: $_" -ForegroundColor Red
}
