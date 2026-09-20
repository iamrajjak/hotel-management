using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

class Program
{
    static async Task Main()
    {
        var tursoUrl = "https://hotelproject-iamrajjak.aws-ap-south-1.turso.io/v2/pipeline";
        var authToken = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODgyODMxNTUsImlkIjoiMDFhMDVkZjktMTUwMS03NGVhLWI4YWItZTYxNDhhZjc0MWUzIiwia2lkIjoibnlKME5mcF9wWkFHVWdBajFIcFFkZFc4VURGYjhyTXhibmp0RXFLXzY1OCIsInJpZCI6ImZkMWE4MDdmLWVhNDMtNDZkZS1hZTBhLTY3Y2ZhMjVmMThjOSJ9.wnrrsSfVKk4p_aXk_YdyHBEbG3J25O_g0IF5-bWaSHie9k3n351cphbtnivUsBVx7Of7h9dt_6gDc1abxAw2Bg";

        using var client = new HttpClient();

        string[] queries = new[]
        {
            "SELECT Id, FullName, Email FROM Profiles;",
            "SELECT Id, HotelId, UserId, Role, Status FROM HotelUsers;",
            "SELECT id, name, status FROM hotels;"
        };

        foreach (var sql in queries)
        {
            var reqObj = new
            {
                requests = new[]
                {
                    new
                    {
                        type = "execute",
                        stmt = new { sql = sql }
                    }
                }
            };

            var json = JsonSerializer.Serialize(reqObj);
            var req = new HttpRequestMessage(HttpMethod.Post, tursoUrl);
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", authToken);
            req.Content = new StringContent(json, Encoding.UTF8, "application/json");

            var res = await client.SendAsync(req);
            var body = await res.Content.ReadAsStringAsync();

            Console.WriteLine($"=== QUERY: {sql} ===");
            Console.WriteLine($"HTTP Status: {res.StatusCode}");
            Console.WriteLine($"Response Body:\n{body}\n");
        }
    }
}
