using System;
using Microsoft.Data.Sqlite;

using var conn = new SqliteConnection("Data Source=e:\\project\\Hotel-Management\\backend\\HotelSaaS.Api\\hotelsaas.db");
conn.Open();

string[] stmts = new string[] {
    "ALTER TABLE Hotels ADD COLUMN WifiName TEXT DEFAULT 'Hotel_Guest_WiFi';",
    "ALTER TABLE Hotels ADD COLUMN WifiPassword TEXT DEFAULT 'Welcome2026';",
    "ALTER TABLE Hotels ADD COLUMN ReviewUrl TEXT DEFAULT 'https://g.page/r/your-hotel-review';",
    "ALTER TABLE hotels ADD COLUMN wifi_name TEXT DEFAULT 'Hotel_Guest_WiFi';",
    "ALTER TABLE hotels ADD COLUMN wifi_password TEXT DEFAULT 'Welcome2026';",
    "ALTER TABLE hotels ADD COLUMN review_url TEXT DEFAULT 'https://g.page/r/your-hotel-review';"
};

foreach (var sql in stmts)
{
    try
    {
        using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        cmd.ExecuteNonQuery();
        Console.WriteLine($"SUCCESS: {sql}");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"SKIP ({sql}): {ex.Message}");
    }
}
Console.WriteLine("Done altering local SQLite DB!");
