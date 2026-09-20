using System;
using Microsoft.Data.Sqlite;

class Program
{
    static void Main()
    {
        var dbPath = @"E:\project\Hotel-Management\backend\HotelSaaS.Api\hotelsaas.db";
        using var conn = new SqliteConnection($"Data Source={dbPath}");
        conn.Open();

        using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT Id, FullName, Email, HotelId FROM Profiles;";
        using var reader = cmd.ExecuteReader();

        Console.WriteLine("--- PROFILES IN LOCAL DB (hotelsaas.db) ---");
        int count = 0;
        while (reader.Read())
        {
            count++;
            Console.WriteLine($"{reader[0]} | {reader[1]} | {reader[2]} | {reader[3]}");
        }
        if (count == 0)
        {
            Console.WriteLine("NO ROWS FOUND IN LOCAL DB (hotelsaas.db)");
        }
    }
}
