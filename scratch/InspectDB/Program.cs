using System;
using Microsoft.Data.Sqlite;

class Program
{
    static void Main()
    {
        var dbPath = @"E:\project\Hotel-Management\backend\HotelSaaS.Api\hotelsaas.db";
        using var conn = new SqliteConnection($"Data Source={dbPath}");
        conn.Open();

        Console.WriteLine("=== VERIFYING SAVED RECORDS IN LOCAL SQLITE DATABASE ===");

        // 1. Room 301
        using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = "SELECT Id, RoomNumber, Price, Status, HotelCode FROM Rooms WHERE RoomNumber = '301';";
            using var r = cmd.ExecuteReader();
            if (r.Read())
            {
                Console.WriteLine($"[ROOM SAVED] RoomNumber: {r["RoomNumber"]}, Price: ₹{r["Price"]}, Status: {r["Status"]}, HotelCode: {r["HotelCode"]}");
            }
        }

        // 2. Customer
        using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = "SELECT Id, FullName, Email, Phone, HotelCode FROM Customers WHERE FullName LIKE '%Vikramaditya%';";
            using var r = cmd.ExecuteReader();
            if (r.Read())
            {
                Console.WriteLine($"[CUSTOMER SAVED] Name: {r["FullName"]}, Email: {r["Email"]}, Phone: {r["Phone"]}, HotelCode: {r["HotelCode"]}");
            }
        }

        // 3. Reservation
        using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = "SELECT Id, BookingNumber, TotalAmount, PaidAmount, BookingStatus, HotelCode FROM Reservations WHERE BookingNumber LIKE 'RES-%' ORDER BY CreatedAt DESC LIMIT 1;";
            using var r = cmd.ExecuteReader();
            if (r.Read())
            {
                Console.WriteLine($"[RESERVATION SAVED] BookingNumber: {r["BookingNumber"]}, Total: ₹{r["TotalAmount"]}, Paid: ₹{r["PaidAmount"]}, Status: {r["BookingStatus"]}, HotelCode: {r["HotelCode"]}");
            }
        }

        // 4. Payment
        using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = "SELECT Id, Amount, PaymentMethod, TransactionId, HotelCode FROM Payments WHERE TransactionId LIKE '%UPI%' ORDER BY CreatedAt DESC LIMIT 1;";
            using var r = cmd.ExecuteReader();
            if (r.Read())
            {
                Console.WriteLine($"[PAYMENT SAVED] Amount: ₹{r["Amount"]}, TxnId: {r["TransactionId"]}, HotelCode: {r["HotelCode"]}");
            }
        }
    }
}
