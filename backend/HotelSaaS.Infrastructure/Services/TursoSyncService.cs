using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace HotelSaaS.Infrastructure.Services;

public interface ITursoSyncService
{
    Task<int> GetMaxTrainIdFromTursoAsync(string tableName);
    Task<bool> ExecuteSqlAsync(string sql, bool throwOnError = false);
    Task SyncRoomAsync(string id, string roomNumber, string roomTypeName, string floor, decimal price, string status, string? hotelId = null, string? roomTypeId = null);
    Task SyncCustomerAsync(string id, string fullName, string email, string phone, string city, string state, string? hotelId = null);
    Task SyncReservationAsync(string id, string bookingNumber, string customerId, string roomId, string checkInDate, string checkOutDate, decimal totalAmount, decimal paidAmount, string paymentStatus, string bookingStatus, string bookingSource, string roomNumber = "", string customerPhone = "", string? hotelId = null, int adults = 1, int children = 0);
    Task DeleteRoomAsync(string id, string roomNumber);
    Task DeleteReservationAsync(string id);
    Task<List<HotelSaaS.Application.DTOs.CustomerDto>> FetchCustomersFromTursoAsync(string? filterHotelId = null);
    Task<List<HotelSaaS.Application.DTOs.RoomDto>> FetchRoomsFromTursoAsync(string? filterHotelId = null);
    Task<List<HotelSaaS.Application.DTOs.ReservationDto>> FetchReservationsFromTursoAsync(string? filterHotelId = null);
    Task<List<HotelSaaS.Application.DTOs.PosCategoryDto>> FetchPosCategoriesFromTursoAsync(string? filterHotelId = null);
    Task<List<HotelSaaS.Application.DTOs.StaffDto>> FetchStaffFromTursoAsync(string? filterHotelId = null);
    Task<List<HotelSaaS.Application.DTOs.ExpenseDto>> FetchExpensesFromTursoAsync(string? filterHotelId = null);
    Task<HotelSaaS.Domain.Entities.Profile?> FetchProfileByEmailFromTursoAsync(string email);
    Task<HotelSaaS.Domain.Entities.Hotel?> FetchHotelByIdFromTursoAsync(Guid hotelId);
    Task SyncProfileAsync(string id, string fullName, string email, string? phone, string passwordHash, bool isSuperAdmin, bool status = false, Guid? hotelId = null, string? role = null, string? staffPasswordHash = null, long trainId = 0);
    Task SyncHotelAsync(string id, string name, string slug, string? phone, string? email, string? address, string? city, string? state, string? country, string? pincode, string status, string? hotelCode = null, string? gstNumber = null, string? taxRate = null, string? bankName = null, string? accountNo = null, string? ifscCode = null, string? upiId = null, string? wifiName = null, string? wifiPassword = null, string? reviewUrl = null, long trainId = 0);
    Task SyncStaffAsync(string id, string firstName, string lastName, string fullName, string mobile, string email, string? address, string role, string department, decimal salary, string status, string? hotelId = null);
    Task DeleteStaffAsync(string id);
    Task SyncExpenseAsync(string id, string category, decimal amount, string description, string expenseDate, string paymentMethod, string? referenceNumber = null, string? createdBy = null, string? hotelId = null);
    Task SyncAttendanceAsync(string id, string hotelId, string staffId, string attendanceDate, string? checkInTime = null, string? checkOutTime = null, string status = "Present", string? notes = null, string? staffName = null, string? staffRole = null);
    Task DeleteMenuItemFromTursoAsync(string id);
    Task UpdateMenuItemInTursoAsync(string id, string name, string description, decimal price, string categoryName, bool isAvailable);
    Task SyncFullDatabaseAsync(HotelSaaS.Infrastructure.Persistence.ApplicationDbContext db);
    Task PullFromTursoToLocalAsync(HotelSaaS.Infrastructure.Persistence.ApplicationDbContext db);
}

public class TursoSyncService : ITursoSyncService
{
    private static readonly HttpClient _httpClient = new HttpClient();
    private readonly string _tursoUrl;
    private readonly string _authToken;
    private readonly ILogger<TursoSyncService> _logger;

    public TursoSyncService(IConfiguration configuration, ILogger<TursoSyncService> logger)
    {
        _logger = logger;
        
        var rawUrl = configuration["Turso:Url"] ?? "https://hotelproject-iamrajjak.aws-ap-south-1.turso.io";
        if (rawUrl.StartsWith("libsql://"))
        {
            rawUrl = "https://" + rawUrl.Substring("libsql://".Length);
        }
        if (!rawUrl.EndsWith("/v2/pipeline"))
        {
            rawUrl = rawUrl.TrimEnd('/') + "/v2/pipeline";
        }
        
        _tursoUrl = rawUrl;
        _authToken = configuration["Turso:AuthToken"] ?? "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODgyODMxNTUsImlkIjoiMDFhMDVkZjktMTUwMS03NGVhLWI4YWItZTYxNDhhZjc0MWUzIiwia2lkIjoibnlKME5mcF9wWkFHVWdBajFIcFFkZFc4VURGYjhyTXhibmp0RXFLXzY1OCIsInJpZCI6ImZkMWE4MDdmLWVhNDMtNDZkZS1hZTBhLTY3Y2ZhMjVmMThjOSJ9.wnrrsSfVKk4p_aXk_YdyHBEbG3J25O_g0IF5-bWaSHie9k3n351cphbtnivUsBVx7Of7h9dt_6gDc1abxAw2Bg";
    }

    public async Task<int> GetMaxTrainIdFromTursoAsync(string tableName)
    {
        try
        {
            var requestObj = new
            {
                requests = new[]
                {
                    new
                    {
                        type = "execute",
                        stmt = new { sql = $"SELECT COALESCE(MAX(trainid), 0) FROM {tableName};" }
                    }
                }
            };

            var json = JsonSerializer.Serialize(requestObj);
            var request = new HttpRequestMessage(HttpMethod.Post, _tursoUrl);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _authToken);
            request.Content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(request);
            if (response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(body);
                var root = doc.RootElement;
                if (root.TryGetProperty("results", out var results) && results.GetArrayLength() > 0 &&
                    results[0].TryGetProperty("response", out var respObj) &&
                    respObj.TryGetProperty("result", out var resVal) &&
                    resVal.TryGetProperty("rows", out var rowsArr) &&
                    rowsArr.GetArrayLength() > 0)
                {
                    var valElem = rowsArr[0].EnumerateArray().FirstOrDefault();
                    return (int)ParseLong(valElem);
                }
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to get MAX(trainid) from Turso Cloud for table: {Table}", tableName);
        }
        return 0;
    }

    private static bool ParseBoolValue(JsonElement colObj)
    {
        if (colObj.TryGetProperty("value", out var valElem))
        {
            if (valElem.ValueKind == JsonValueKind.Number)
            {
                return valElem.GetInt64() == 1;
            }
            if (valElem.ValueKind == JsonValueKind.String)
            {
                var s = valElem.GetString()?.Trim().ToLower();
                return s == "1" || s == "true";
            }
            if (valElem.ValueKind == JsonValueKind.True) return true;
        }
        return false;
    }

    private static DateTime ParseDateTime(string? input, DateTime fallback)
    {
        if (string.IsNullOrWhiteSpace(input)) return fallback;
        var clean = input.Trim().Replace("📅", "").Replace("⏰", "").Trim();

        string[] formats = new string[]
        {
            "yyyy-MM-dd HH:mm:ss", "yyyy-MM-dd HH:mm", "yyyy-MM-dd",
            "d MMM yyyy, h:mm tt", "dd MMM yyyy, h:mm tt", "d MMM yyyy, hh:mm tt", "dd MMM yyyy, hh:mm tt",
            "d MMM yyyy", "dd MMM yyyy", "M/d/yyyy h:mm:ss tt", "MM/dd/yyyy HH:mm:ss",
            "yyyy-MM-ddTHH:mm:ss", "yyyy-MM-ddTHH:mm:ss.fffZ"
        };

        if (DateTime.TryParseExact(clean, formats, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var dtExact))
            return dtExact;

        if (DateTime.TryParse(clean, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var dtInv))
            return dtInv;

        if (DateTime.TryParse(clean, out var dtLocal))
            return dtLocal;

        return fallback;
    }

    private static string CleanHotelId(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return "hotel-1";
        var trimmed = raw.Trim();
        if (trimmed == "00000000-0000-0000-0000-000000000001" || trimmed.Contains("grand-palace"))
            return "hotel-1";
        if (trimmed == "00000000-0000-0000-0000-000000000002")
            return "hotel-2";
        if (trimmed == "00000000-0000-0000-0000-000000000003")
            return "hotel-3";
        if (trimmed.StartsWith("hotel-", StringComparison.OrdinalIgnoreCase)) return trimmed.ToLowerInvariant();

        if (Guid.TryParse(trimmed, out var guid))
        {
            var str = guid.ToString();
            if (str.StartsWith("00000000-0000-0000-0000-"))
            {
                var lastPart = str.Substring("00000000-0000-0000-0000-".Length);
                if (long.TryParse(lastPart, System.Globalization.NumberStyles.HexNumber, null, out var num))
                {
                    return $"hotel-{num}";
                }
            }
            var bytes = guid.ToByteArray();
            var shortNum = Math.Abs(BitConverter.ToInt32(bytes, 0)) % 100;
            return $"hotel-{(shortNum == 0 ? 1 : shortNum)}";
        }

        return "hotel-1";
    }

    private static string CleanProfileId(string? raw, string? email = null)
    {
        if (email?.ToLower().Contains("admin") == true || raw == "00000000-0000-0000-0001-000000000001") return "user-1";
        if (string.IsNullOrWhiteSpace(raw)) return "user-1";
        var trimmed = raw.Trim();
        if (trimmed.StartsWith("profile-") || trimmed.StartsWith("user-")) return trimmed;

        if (Guid.TryParse(trimmed, out var guid))
        {
            var str = guid.ToString();
            if (str.StartsWith("00000000-0000-0000-0001-"))
            {
                var lastPart = str.Substring("00000000-0000-0000-0001-".Length);
                if (long.TryParse(lastPart, System.Globalization.NumberStyles.HexNumber, null, out var num))
                {
                    return $"user-{num}";
                }
            }
        }

        var s = trimmed.Replace("-", "");
        return "user-" + (s.Length > 6 ? s.Substring(0, 6) : s);
    }

    private static string CleanRoomTypeId(string? raw, string? name = null, string? slug = null, string? hId = "hotel-001")
    {
        if (raw == "00000000-0000-0000-0002-000000000001" && (hId == "hotel-001" || string.IsNullOrEmpty(hId))) return "type-deluxe-queen-room";
        if (raw == "00000000-0000-0000-0002-000000000002" && (hId == "hotel-001" || string.IsNullOrEmpty(hId))) return "type-executive-suite";
        if (raw == "00000000-0000-0000-0002-000000000003" && (hId == "hotel-001" || string.IsNullOrEmpty(hId))) return "type-standard-twin-room";

        if (!string.IsNullOrWhiteSpace(raw) && raw.StartsWith("type-")) return raw;

        var baseSlug = !string.IsNullOrWhiteSpace(slug)
            ? slug.Trim().ToLower().Replace(" ", "-")
            : (!string.IsNullOrWhiteSpace(name) ? name.Trim().ToLower().Replace(" ", "-") : "deluxe");

        return $"type-{baseSlug}";
    }

    private static string CleanRoomId(string? raw, string? roomNum = null, string? hId = "hotel-001")
    {
        var num = (roomNum ?? "").Trim().Replace("Room ", "").Replace("room ", "");
        if (raw == "00000000-0000-0000-0003-000000000101" && (hId == "hotel-001" || string.IsNullOrEmpty(hId))) return "room-101";
        if (raw == "00000000-0000-0000-0003-000000000102" && (hId == "hotel-001" || string.IsNullOrEmpty(hId))) return "room-102";
        if (raw == "00000000-0000-0000-0003-000000000103" && (hId == "hotel-001" || string.IsNullOrEmpty(hId))) return "room-103";
        if (raw == "00000000-0000-0000-0003-000000000201" && (hId == "hotel-001" || string.IsNullOrEmpty(hId))) return "room-201";
        if (raw == "00000000-0000-0000-0003-000000000202" && (hId == "hotel-001" || string.IsNullOrEmpty(hId))) return "room-202";

        if (!string.IsNullOrWhiteSpace(raw) && raw.StartsWith("room-")) return raw;

        if (Guid.TryParse(raw, out var g))
        {
            var str = g.ToString();
            if (str.StartsWith("00000000-0000-0000-0003-"))
            {
                var lastPart = str.Substring("00000000-0000-0000-0003-".Length);
                if (long.TryParse(lastPart, System.Globalization.NumberStyles.HexNumber, null, out var n))
                {
                    return $"room-{n:D3}";
                }
            }
        }

        if (!string.IsNullOrWhiteSpace(num))
        {
            return $"room-{num}";
        }

        if (string.IsNullOrWhiteSpace(raw)) return "room-101";
        var s = raw.Replace("-", "");
        var shortStr = s.Length > 6 ? s.Substring(0, 6) : s;
        return $"room-{shortStr}";
    }

    private static string CleanCustomerId(string? raw, string? phone = null, string? hId = "hotel-001")
    {
        if (raw == "00000000-0000-0000-0004-000000000001" && (hId == "hotel-001" || string.IsNullOrEmpty(hId))) return "cust-001";
        if (raw == "00000000-0000-0000-0004-000000000002" && (hId == "hotel-001" || string.IsNullOrEmpty(hId))) return "cust-002";
        if (!string.IsNullOrWhiteSpace(raw) && (raw.StartsWith("cust-") || raw.StartsWith("user-") || raw.StartsWith("profile-"))) return raw;

        if (Guid.TryParse(raw, out var g))
        {
            var str = g.ToString();
            if (str.StartsWith("00000000-0000-0000-0004-"))
            {
                var lastPart = str.Substring("00000000-0000-0000-0004-".Length);
                if (long.TryParse(lastPart, System.Globalization.NumberStyles.HexNumber, null, out var num))
                {
                    return $"cust-{num:D3}";
                }
            }
        }

        var s = (raw ?? "").Replace("-", "");
        var shortStr = string.IsNullOrWhiteSpace(s) ? "001" : (s.Length > 6 ? s.Substring(0, 6) : s);
        return $"cust-{shortStr}";
    }

    private static string CleanReservationId(string? raw, string? bookingNum = null, string? hId = "hotel-001")
    {
        if (!string.IsNullOrWhiteSpace(bookingNum))
        {
            var b = bookingNum.Trim();
            if (b.StartsWith("RES-", StringComparison.OrdinalIgnoreCase))
            {
                var code = b.Substring(4).ToLower();
                return $"res-{code}";
            }
            if (b.StartsWith("BK-", StringComparison.OrdinalIgnoreCase))
            {
                var code = b.Substring(3).ToLower();
                return $"res-{code}";
            }
            return $"res-{b.ToLower()}";
        }
        if (raw == "00000000-0000-0000-0005-000000001001" && (hId == "hotel-001" || string.IsNullOrEmpty(hId))) return "res-20260908-1001";
        if (raw == "00000000-0000-0000-0005-000000001002" && (hId == "hotel-001" || string.IsNullOrEmpty(hId))) return "res-20260908-1002";
        if (!string.IsNullOrWhiteSpace(raw) && raw.StartsWith("res-")) return raw;

        var s = (raw ?? "").Replace("-", "");
        var shortStr = string.IsNullOrWhiteSpace(s) ? "1001" : (s.Length > 6 ? s.Substring(0, 6) : s);
        return $"res-{shortStr}";
    }

    private static string CleanStaffId(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return $"staff-{Guid.NewGuid().ToString("N").Substring(0, 8)}";
        var trimmed = raw.Trim();
        if (trimmed.StartsWith("staff-")) return trimmed;

        if (Guid.TryParse(trimmed, out var guid))
        {
            var str = guid.ToString();
            if (str.StartsWith("00000000-0000-0000-0006-"))
            {
                var lastPart = str.Substring("00000000-0000-0000-0006-".Length);
                if (long.TryParse(lastPart, System.Globalization.NumberStyles.HexNumber, null, out var num))
                {
                    return $"staff-{num}";
                }
            }
            return str;
        }

        return trimmed;
    }

    private static Guid GetDeterministicGuid(string input)
    {
        if (Guid.TryParse(input, out var parsed))
            return parsed;

        if (input != null && input.StartsWith("hotel-"))
        {
            var numStr = input.Substring(6);
            if (int.TryParse(numStr, out var num))
            {
                return Guid.Parse($"00000000-0000-0000-0000-{num:D12}");
            }
        }
        if (input != null && input.StartsWith("staff-"))
        {
            var numStr = input.Substring(6);
            if (int.TryParse(numStr, out var num))
            {
                return Guid.Parse($"00000000-0000-0000-0006-{num:D12}");
            }
        }
        if (input == "hotel-001") return Guid.Parse("00000000-0000-0000-0000-000000000001");
        if (input == "profile-admin") return Guid.Parse("00000000-0000-0000-0001-000000000001");
        if (input == "profile-owner") return Guid.Parse("00000000-0000-0000-0001-000000000002");
        if (input == "profile-manager") return Guid.Parse("00000000-0000-0000-0001-000000000003");
        if (input == "type-deluxe-queen-room") return Guid.Parse("00000000-0000-0000-0002-000000000001");
        if (input == "type-executive-suite") return Guid.Parse("00000000-0000-0000-0002-000000000002");
        if (input == "type-standard-twin-room") return Guid.Parse("00000000-0000-0000-0002-000000000003");
        if (input == "room-101") return Guid.Parse("00000000-0000-0000-0003-000000000101");
        if (input == "room-102") return Guid.Parse("00000000-0000-0000-0003-000000000102");
        if (input == "room-103") return Guid.Parse("00000000-0000-0000-0003-000000000103");
        if (input == "room-201") return Guid.Parse("00000000-0000-0000-0003-000000000201");
        if (input == "room-202") return Guid.Parse("00000000-0000-0000-0003-000000000202");
        if (input == "cust-001") return Guid.Parse("00000000-0000-0000-0004-000000000001");
        if (input == "cust-002") return Guid.Parse("00000000-0000-0000-0004-000000000002");
        if (input == "res-20260908-1001" || input == "res-1001") return Guid.Parse("00000000-0000-0000-0005-000000001001");
        if (input == "res-20260908-1002" || input == "res-1002") return Guid.Parse("00000000-0000-0000-0005-000000001002");

        using var md5 = MD5.Create();
        var hash = md5.ComputeHash(Encoding.UTF8.GetBytes(input ?? "reservation"));
        return new Guid(hash);
    }

    public async Task<bool> ExecuteSqlAsync(string sql, bool throwOnError = false)
    {
        try
        {
            var requestObj = new
            {
                requests = new[]
                {
                    new
                    {
                        type = "execute",
                        stmt = new { sql }
                    }
                }
            };

            var json = JsonSerializer.Serialize(requestObj);
            var request = new HttpRequestMessage(HttpMethod.Post, _tursoUrl);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _authToken);
            request.Content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(request);
            var body = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                using var doc = JsonDocument.Parse(body);
                var root = doc.RootElement;
                if (root.TryGetProperty("results", out var results) && results.GetArrayLength() > 0)
                {
                    var firstRes = results[0];
                    if (firstRes.TryGetProperty("type", out var resType) && resType.GetString() == "error")
                    {
                        var errMessage = firstRes.TryGetProperty("error", out var errObj) && errObj.TryGetProperty("message", out var msgVal)
                            ? msgVal.GetString()
                            : "Turso SQL Error";
                        _logger?.LogError("Turso SQL Execution Failed: {Err} | SQL: {Sql}", errMessage, sql);
                        if (throwOnError)
                            throw new Exception($"Turso DB Error: {errMessage}");
                        return false;
                    }
                }
                _logger?.LogInformation("Successfully synced SQL to Turso Cloud: {Sql}", sql);
                return true;
            }
            else
            {
                _logger?.LogWarning("Turso Cloud Sync HTTP status {Code}: {Body}", response.StatusCode, body);
                if (throwOnError)
                    throw new Exception($"Turso Cloud HTTP {response.StatusCode}: {body}");
                return false;
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to sync SQL statement to Turso Cloud: {Sql}", sql);
            if (throwOnError)
                throw;
            return false;
        }
    }

    public async Task SyncRoomAsync(string id, string roomNumber, string roomTypeName, string floor, decimal price, string status, string? hotelId = null, string? roomTypeId = null)
    {
        var cleanRoomNum = (roomNumber ?? "101").Trim();
        var hId = CleanHotelId(hotelId);
        var roomIdStr = CleanRoomId(id, cleanRoomNum, hId);
        var rtId = CleanRoomTypeId(roomTypeId, roomTypeName, null, hId);

        var escapedType = (roomTypeName ?? "Deluxe Queen Room").Replace("'", "''");
        var slugVal = (roomTypeName ?? "deluxe").Trim().ToLowerInvariant().Replace(" ", "-");
        
        var hotelSql = $"INSERT INTO hotels (id, name, status) VALUES ('{hId}', 'Grand Palace Hotel', 'Active') ON CONFLICT(id) DO UPDATE SET name = name;";
        var typeSql = $@"INSERT INTO room_types (id, hotel_id, name, slug, base_price) VALUES ('{rtId}', '{hId}', '{escapedType}', '{slugVal}', {price}) ON CONFLICT(id) DO UPDATE SET name = '{escapedType}', slug = '{slugVal}', base_price = {price};";
        
        var insertRoomSql = $@"INSERT INTO rooms (id, hotel_id, room_type_id, room_number, floor, price, status) 
VALUES ('{roomIdStr}', '{hId}', '{rtId}', '{cleanRoomNum}', '{floor}', {price}, '{status}')
ON CONFLICT(id) DO UPDATE SET hotel_id = '{hId}', room_type_id = '{rtId}', room_number = '{cleanRoomNum}', floor = '{floor}', price = {price}, status = '{status}';";

        await ExecuteSqlAsync(hotelSql);
        await ExecuteSqlAsync(typeSql);
        await ExecuteSqlAsync(insertRoomSql);
    }

    public async Task SyncCustomerAsync(string id, string fullName, string email, string phone, string city, string state, string? hotelId = null)
    {
        var cleanPhone = (phone ?? "").Trim();
        var hId = CleanHotelId(hotelId);
        var custId = CleanCustomerId(id, phone, hId);

        var hotelSql = $"INSERT INTO hotels (id, name, status) VALUES ('{hId}', 'Grand Palace Hotel', 'Active') ON CONFLICT(id) DO UPDATE SET name = name;";
        var sql = $@"INSERT INTO customers (id, hotel_id, full_name, email, phone, city) 
VALUES ('{custId}', '{hId}', '{fullName.Replace("'", "''")}', '{email.Replace("'", "''")}', '{cleanPhone.Replace("'", "''")}', '{city.Replace("'", "''")}')
ON CONFLICT(id) DO UPDATE SET hotel_id = '{hId}', full_name = '{fullName.Replace("'", "''")}', email = '{email.Replace("'", "''")}', phone = '{cleanPhone.Replace("'", "''")}', city = '{city.Replace("'", "''")}';";

        await ExecuteSqlAsync(hotelSql);
        await ExecuteSqlAsync(sql);
    }

    public async Task SyncReservationAsync(
        string id, 
        string bookingNumber, 
        string customerId, 
        string roomId, 
        string checkInDate, 
        string checkOutDate, 
        decimal totalAmount, 
        decimal paidAmount, 
        string paymentStatus, 
        string bookingStatus, 
        string bookingSource,
        string roomNumber = "",
        string customerPhone = "",
        string? hotelId = null,
        int adults = 1,
        int children = 0)
    {
        var hId = CleanHotelId(hotelId);
        var resId = CleanReservationId(id, bookingNumber, hId);
        var cId = CleanCustomerId(customerId, customerPhone, hId);
        var rId = CleanRoomId(roomId, roomNumber, hId);
        var rtId = CleanRoomTypeId(null, "Deluxe", null, hId);
        var dueAmount = totalAmount - paidAmount;
        if (dueAmount < 0) dueAmount = 0;

        var hotelSql = $"INSERT INTO hotels (id, name, status) VALUES ('{hId}', 'Grand Palace Hotel', 'Active') ON CONFLICT(id) DO UPDATE SET name = name;";
        var typeSql = $"INSERT INTO room_types (id, hotel_id, name, slug, base_price) VALUES ('{rtId}', '{hId}', 'Deluxe Room', 'deluxe', 5000) ON CONFLICT(id) DO UPDATE SET name = name;";
        var custSql = $"INSERT INTO customers (id, hotel_id, full_name, phone) VALUES ('{cId}', '{hId}', 'Guest', '{customerPhone}') ON CONFLICT(id) DO UPDATE SET full_name = full_name;";
        var roomSql = $"INSERT INTO rooms (id, hotel_id, room_type_id, room_number, floor, price, status) VALUES ('{rId}', '{hId}', '{rtId}', '{(string.IsNullOrWhiteSpace(roomNumber) ? "101" : roomNumber)}', '1st Floor', {totalAmount}, 'Occupied') ON CONFLICT(id) DO UPDATE SET status = status;";

        var insertSqlLower = $@"INSERT INTO reservations (id, hotel_id, customer_id, room_id, check_in_date, check_out_date, adults, children, booking_status, total_amount, paid_amount, due_amount, payment_status, booking_number, trainid) 
VALUES (
  '{resId}', 
  '{hId}', 
  '{cId}', 
  '{rId}', 
  '{checkInDate}', 
  '{checkOutDate}', 
  {adults}, {children}, 
  '{bookingStatus}', 
  {totalAmount},
  {paidAmount},
  {dueAmount},
  '{paymentStatus}',
  '{bookingNumber}',
  (SELECT COALESCE(MAX(trainid), 0) + 1 FROM reservations)
)
ON CONFLICT(id) DO UPDATE SET 
  hotel_id = '{hId}',
  customer_id = '{cId}',
  room_id = '{rId}',
  adults = {adults},
  children = {children},
  booking_status = '{bookingStatus}', 
  check_in_date = '{checkInDate}', 
  check_out_date = '{checkOutDate}', 
  total_amount = {totalAmount},
  paid_amount = {paidAmount},
  due_amount = {dueAmount},
  payment_status = '{paymentStatus}',
  booking_number = '{bookingNumber}';";

        var insertSqlUpper = $@"INSERT INTO Reservations (id, hotel_id, customer_id, room_id, check_in_date, check_out_date, adults, children, booking_status, total_amount, paid_amount, due_amount, payment_status, booking_number, trainid) 
VALUES (
  '{resId}', 
  '{hId}', 
  '{cId}', 
  '{rId}', 
  '{checkInDate}', 
  '{checkOutDate}', 
  {adults}, {children}, 
  '{bookingStatus}', 
  {totalAmount},
  {paidAmount},
  {dueAmount},
  '{paymentStatus}',
  '{bookingNumber}',
  (SELECT COALESCE(MAX(trainid), 0) + 1 FROM Reservations)
)
ON CONFLICT(id) DO UPDATE SET 
  hotel_id = '{hId}',
  customer_id = '{cId}',
  room_id = '{rId}',
  adults = {adults},
  children = {children},
  booking_status = '{bookingStatus}', 
  check_in_date = '{checkInDate}', 
  check_out_date = '{checkOutDate}', 
  total_amount = {totalAmount},
  paid_amount = {paidAmount},
  due_amount = {dueAmount},
  payment_status = '{paymentStatus}',
  booking_number = '{bookingNumber}';";

        await ExecuteSqlAsync(hotelSql);
        await ExecuteSqlAsync(typeSql);
        await ExecuteSqlAsync(custSql);
        await ExecuteSqlAsync(roomSql);
        await ExecuteSqlAsync(insertSqlLower, throwOnError: false);
        await ExecuteSqlAsync(insertSqlUpper, throwOnError: false);
    }

    public async Task SyncFullDatabaseAsync(HotelSaaS.Infrastructure.Persistence.ApplicationDbContext db)
    {
        try
        {
            // 0. Clean legacy hotel-001 / fallback dummy records from Turso Cloud DB
            await ExecuteSqlAsync("DELETE FROM reservations WHERE hotel_id = 'hotel-001' OR hotel_id = '11111111-1111-1111-1111-111111111111';");
            await ExecuteSqlAsync("DELETE FROM customers WHERE hotel_id = 'hotel-001' OR hotel_id = '11111111-1111-1111-1111-111111111111';");
            await ExecuteSqlAsync("DELETE FROM rooms WHERE hotel_id = 'hotel-001' OR hotel_id = '11111111-1111-1111-1111-111111111111';");
            await ExecuteSqlAsync("DELETE FROM room_types WHERE hotel_id = 'hotel-001' OR hotel_id = '11111111-1111-1111-1111-111111111111';");
            await ExecuteSqlAsync("DELETE FROM HotelUsers WHERE Id NOT LIKE 'hu-%' AND Id NOT LIKE '00000000%';");
            await ExecuteSqlAsync("DELETE FROM Profiles WHERE Id NOT LIKE 'user-%' AND Id NOT LIKE 'profile-%' AND Id NOT LIKE '00000000%';");
            await ExecuteSqlAsync("DELETE FROM hotels WHERE id = 'hotel-001' OR id = '11111111-1111-1111-1111-111111111111' OR id NOT LIKE 'hotel-%';");

            // 1. Sync Hotels
            var hotels = await db.Hotels.IgnoreQueryFilters().ToListAsync();
            foreach (var h in hotels)
            {
                await SyncHotelAsync(h.Id.ToString(), h.Name, h.Slug, h.Phone, h.Email, h.Address, h.City, h.State, h.Country, h.Pincode, h.Status, h.HotelCode);
            }

            // 2. Sync Profiles
            var profiles = await db.Profiles.IgnoreQueryFilters().ToListAsync();
            foreach (var p in profiles)
            {
                await SyncProfileAsync(p.Id.ToString(), p.FullName, p.Email, p.Phone, p.PasswordHash, p.IsSuperAdmin, p.Status, p.HotelId, p.Role.ToString(), p.StaffPasswordHash);
            }

            // 3. Sync RoomTypes
            var roomTypes = await db.RoomTypes.IgnoreQueryFilters().ToListAsync();
            foreach (var rt in roomTypes)
            {
                var hId = CleanHotelId(rt.HotelId.ToString());
                var rtId = CleanRoomTypeId(rt.Id.ToString(), rt.Name, rt.Slug, hId);
                var slugVal = string.IsNullOrWhiteSpace(rt.Slug) ? rt.Name.ToLowerInvariant().Replace(" ", "-") : rt.Slug;
                var rtSql = $@"INSERT INTO room_types (id, hotel_id, name, slug, base_price) 
VALUES ('{rtId}', '{hId}', '{rt.Name.Replace("'", "''")}', '{slugVal}', {rt.BasePrice})
ON CONFLICT(id) DO UPDATE SET name = '{rt.Name.Replace("'", "''")}', slug = '{slugVal}', base_price = {rt.BasePrice};";
                await ExecuteSqlAsync(rtSql);
            }

            // 5. Sync Rooms
            var rooms = await db.Rooms.IgnoreQueryFilters().Include(r => r.RoomType).ToListAsync();
            foreach (var r in rooms)
            {
                await SyncRoomAsync(r.Id.ToString(), r.RoomNumber, r.RoomType?.Name ?? "Standard", r.Floor, r.Price, r.Status.ToString(), r.HotelId.ToString(), r.RoomTypeId.ToString());
            }

            // 6. Sync Customers
            var customers = await db.Customers.IgnoreQueryFilters().ToListAsync();
            foreach (var c in customers)
            {
                await SyncCustomerAsync(c.Id.ToString(), c.FullName, c.Email, c.Phone, c.City ?? "", c.State ?? "", c.HotelId.ToString());
            }

            // 7. Sync Reservations
            var reservations = await db.Reservations.IgnoreQueryFilters().Include(res => res.Customer).Include(res => res.Room).ToListAsync();
            foreach (var res in reservations)
            {
                await SyncReservationAsync(
                    res.Id.ToString(),
                    res.BookingNumber,
                    res.CustomerId.ToString(),
                    res.RoomId.ToString(),
                    res.CheckInDate.ToString("yyyy-MM-dd HH:mm:ss"),
                    res.CheckOutDate.ToString("yyyy-MM-dd HH:mm:ss"),
                    res.TotalAmount,
                    res.PaidAmount,
                    res.PaymentStatus.ToString(),
                    res.BookingStatus.ToString(),
                    res.BookingSource,
                    res.Room?.RoomNumber ?? "",
                    res.Customer?.Phone ?? "",
                    res.HotelId.ToString()
                );
            }

            // 8. Sync Staffs
            var staffs = await db.Staffs.IgnoreQueryFilters().ToListAsync();
            foreach (var st in staffs)
            {
                await SyncStaffAsync(st.Id.ToString(), st.FirstName, st.LastName, st.FullName, st.Mobile, st.Email, st.Address, st.Role, st.Department, st.Salary, st.Status, st.HotelId.ToString());
            }

            // 9. Sync Expenses
            var expenses = await db.Expenses.IgnoreQueryFilters().ToListAsync();
            foreach (var ex in expenses)
            {
                await SyncExpenseAsync(ex.Id.ToString(), ex.Category, ex.Amount, ex.Description, ex.ExpenseDate.ToString("yyyy-MM-dd HH:mm:ss"), ex.PaymentMethod, ex.ReferenceNumber, ex.CreatedBy, ex.HotelId.ToString());
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error syncing full database to Turso Cloud");
        }
    }

    public async Task DeleteRoomAsync(string id, string roomNumber)
    {
        var cleanRoomNum = (roomNumber ?? "").Trim();
        var cleanId = (id ?? "").Trim();
        var customRoomId = cleanRoomNum.StartsWith("room-") ? cleanRoomNum : $"room-{cleanRoomNum.PadLeft(3, '0')}";
        
        var sqlRes = $@"DELETE FROM reservations WHERE room_id = '{cleanId}' OR room_id = '{customRoomId}' OR room_id = '{cleanRoomNum}' OR room_id IN (SELECT id FROM rooms WHERE room_number = '{cleanRoomNum}' OR id = '{cleanId}');";
        var sqlRoom = $@"DELETE FROM rooms WHERE id = '{cleanId}' OR id = '{customRoomId}' OR room_number = '{cleanRoomNum}' OR room_number = '{cleanId}';";
        
        await ExecuteSqlAsync(sqlRes);
        await ExecuteSqlAsync(sqlRoom);
    }

    public async Task DeleteReservationAsync(string id)
    {
        var cleanId = (id ?? "").Trim();
        var sqlLower = $@"DELETE FROM reservations WHERE id = '{cleanId}' OR booking_number = '{cleanId}' OR id = 'res-{cleanId}' OR booking_number = 'BK-{cleanId}' OR id LIKE '%{cleanId}%';";
        var sqlUpper = $@"DELETE FROM Reservations WHERE id = '{cleanId}' OR booking_number = '{cleanId}' OR id = 'res-{cleanId}' OR booking_number = 'BK-{cleanId}' OR id LIKE '%{cleanId}%';";
        await ExecuteSqlAsync(sqlLower);
        await ExecuteSqlAsync(sqlUpper);
    }

    public async Task<List<HotelSaaS.Application.DTOs.CustomerDto>> FetchCustomersFromTursoAsync(string? filterHotelId = null)
    {
        try
        {
            var sqlQuery = "SELECT id, full_name, email, phone, city, hotel_id, trainid FROM customers ORDER BY trainid DESC, rowid DESC;";
            if (!string.IsNullOrWhiteSpace(filterHotelId))
            {
                var cleanH = CleanHotelId(filterHotelId);
                sqlQuery = $"SELECT id, full_name, email, phone, city, hotel_id, trainid FROM customers WHERE hotel_id = '{cleanH}' OR hotel_id = '{filterHotelId}' ORDER BY trainid DESC, rowid DESC;";
            }

            var requestObj = new
            {
                requests = new[]
                {
                    new
                    {
                        type = "execute",
                        stmt = new { sql = sqlQuery }
                    }
                }
            };

            var json = JsonSerializer.Serialize(requestObj);
            var request = new HttpRequestMessage(HttpMethod.Post, _tursoUrl);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _authToken);
            request.Content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(request);
            if (response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(body);
                var root = doc.RootElement;

                var list = new List<HotelSaaS.Application.DTOs.CustomerDto>();
                if (root.TryGetProperty("results", out var results) && results.GetArrayLength() > 0)
                {
                    var firstResult = results[0];
                    if (firstResult.TryGetProperty("response", out var respObj) &&
                        respObj.TryGetProperty("result", out var resVal) &&
                        resVal.TryGetProperty("rows", out var rowsArr))
                    {
                        foreach (var row in rowsArr.EnumerateArray())
                        {
                            var cols = row.EnumerateArray().ToList();
                            if (cols.Count >= 4)
                            {
                                var idStr = GetStringVal(cols[0]);
                                var name = GetStringVal(cols[1]);
                                var email = GetStringVal(cols[2]);
                                var phone = GetStringVal(cols[3]);
                                var city = cols.Count > 4 ? GetStringVal(cols[4]) : "";
                                var rawHotelId = cols.Count > 5 ? GetStringVal(cols[5], "hotel-1") : "hotel-1";
                                var trainidVal = cols.Count > 6 ? ParseLong(cols[6]) : 0L;

                                var idGuid = GetDeterministicGuid(idStr);
                                var hotelGuid = GetDeterministicGuid(string.IsNullOrWhiteSpace(rawHotelId) ? "hotel-1" : rawHotelId);

                                list.Add(new HotelSaaS.Application.DTOs.CustomerDto(
                                    trainidVal,
                                    idGuid,
                                    hotelGuid,
                                    name, email, phone, null, city, null, "India",
                                    null, null, null, null, 0, 0, DateTime.UtcNow
                                ));
                            }
                        }
                    }
                }
                return list;
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to fetch customers live from Turso Cloud");
        }
        return new List<HotelSaaS.Application.DTOs.CustomerDto>();
    }

    private static string GetStringVal(JsonElement colObj, string fallback = "")
    {
        if (colObj.ValueKind == JsonValueKind.Object)
        {
            if (colObj.TryGetProperty("value", out var valElem))
            {
                if (valElem.ValueKind == JsonValueKind.String) return valElem.GetString() ?? fallback;
                if (valElem.ValueKind == JsonValueKind.Number) return valElem.ToString();
                if (valElem.ValueKind == JsonValueKind.True) return "true";
                if (valElem.ValueKind == JsonValueKind.False) return "false";
            }
            return fallback;
        }
        if (colObj.ValueKind == JsonValueKind.String) return colObj.GetString() ?? fallback;
        if (colObj.ValueKind == JsonValueKind.Number) return colObj.ToString();
        return fallback;
    }

    private static decimal ParseDecimal(JsonElement elem)
    {
        if (elem.ValueKind == JsonValueKind.Object)
        {
            if (elem.TryGetProperty("value", out var valProp))
            {
                elem = valProp;
            }
            else
            {
                return 0m;
            }
        }
        if (elem.ValueKind == JsonValueKind.Number) return elem.GetDecimal();
        if (elem.ValueKind == JsonValueKind.String && decimal.TryParse(elem.GetString(), out var val)) return val;
        return 0m;
    }

    private static long ParseLong(JsonElement elem)
    {
        if (elem.ValueKind == JsonValueKind.Object)
        {
            if (elem.TryGetProperty("value", out var valProp))
            {
                elem = valProp;
            }
            else
            {
                return 0L;
            }
        }
        if (elem.ValueKind == JsonValueKind.Number) return elem.GetInt64();
        if (elem.ValueKind == JsonValueKind.String && long.TryParse(elem.GetString(), out var val)) return val;
        return 0L;
    }

    public async Task<List<HotelSaaS.Application.DTOs.RoomDto>> FetchRoomsFromTursoAsync(string? filterHotelId = null)
    {
        try
        {
            var sqlQuery = "SELECT r.trainid, r.id, r.room_number, r.floor, r.price, r.status, rt.name, r.hotel_id, r.room_type_id FROM rooms r LEFT JOIN room_types rt ON r.room_type_id = rt.id ORDER BY r.trainid ASC, r.room_number ASC;";
            if (!string.IsNullOrWhiteSpace(filterHotelId))
            {
                var cleanH = CleanHotelId(filterHotelId);
                sqlQuery = $"SELECT r.trainid, r.id, r.room_number, r.floor, r.price, r.status, rt.name, r.hotel_id, r.room_type_id FROM rooms r LEFT JOIN room_types rt ON r.room_type_id = rt.id WHERE r.hotel_id = '{cleanH}' OR r.hotel_id = '{filterHotelId}' ORDER BY r.trainid ASC, r.room_number ASC;";
            }

            var requestObj = new
            {
                requests = new[]
                {
                    new
                    {
                        type = "execute",
                        stmt = new { sql = sqlQuery }
                    }
                }
            };

            var json = JsonSerializer.Serialize(requestObj);
            var request = new HttpRequestMessage(HttpMethod.Post, _tursoUrl);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _authToken);
            request.Content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(request);
            if (response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(body);
                var root = doc.RootElement;

                var list = new List<HotelSaaS.Application.DTOs.RoomDto>();
                if (root.TryGetProperty("results", out var results) && results.GetArrayLength() > 0)
                {
                    var firstResult = results[0];
                    if (firstResult.TryGetProperty("response", out var respObj) &&
                        respObj.TryGetProperty("result", out var resVal) &&
                        resVal.TryGetProperty("rows", out var rowsArr))
                    {
                        foreach (var row in rowsArr.EnumerateArray())
                        {
                            var cols = row.EnumerateArray().ToList();
                            if (cols.Count >= 6)
                            {
                                var trainidVal = ParseLong(cols[0].GetProperty("value"));
                                var idStr = cols[1].GetProperty("value").GetString() ?? "";
                                var roomNum = cols[2].GetProperty("value").GetString() ?? "";
                                var floor = cols[3].GetProperty("value").GetString() ?? "1st Floor";
                                var priceVal = ParseDecimal(cols[4].GetProperty("value"));
                                var statusStr = cols[5].GetProperty("value").GetString() ?? "Available";
                                Enum.TryParse<HotelSaaS.Domain.Enums.RoomStatus>(statusStr, true, out var parsedStatus);

                                var roomTypeName = cols.Count > 6 && cols[6].GetProperty("value").ValueKind == JsonValueKind.String
                                    ? cols[6].GetProperty("value").GetString()
                                    : "Deluxe Queen Room";

                                if (string.IsNullOrWhiteSpace(roomTypeName))
                                {
                                    roomTypeName = "Deluxe Queen Room";
                                }

                                var hotelIdStr = cols.Count > 7 && cols[7].GetProperty("value").ValueKind == JsonValueKind.String
                                    ? cols[7].GetProperty("value").GetString()
                                    : "hotel-001";

                                var roomTypeIdStr = cols.Count > 8 && cols[8].GetProperty("value").ValueKind == JsonValueKind.String
                                    ? cols[8].GetProperty("value").GetString()
                                    : roomTypeName.ToLower().Replace(" ", "-");

                                var idGuid = GetDeterministicGuid(string.IsNullOrWhiteSpace(idStr) ? roomNum : idStr);
                                var hotelGuid = GetDeterministicGuid(string.IsNullOrWhiteSpace(hotelIdStr) ? "hotel-001" : hotelIdStr);
                                var typeGuid = GetDeterministicGuid(string.IsNullOrWhiteSpace(roomTypeIdStr) ? roomTypeName.ToLower().Replace(" ", "-") : roomTypeIdStr);

                                list.Add(new HotelSaaS.Application.DTOs.RoomDto(
                                    trainidVal,
                                    idGuid,
                                    hotelGuid,
                                    typeGuid,
                                    roomTypeName,
                                    roomNum, floor, priceVal, parsedStatus, null
                                ));
                            }
                        }
                    }
                }
                return list;
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to fetch rooms live from Turso Cloud");
        }
        return new List<HotelSaaS.Application.DTOs.RoomDto>();
    }

    public async Task<List<HotelSaaS.Application.DTOs.PosCategoryDto>> FetchPosCategoriesFromTursoAsync(string? filterHotelId = null)
    {
        try
        {
            var catSql = "SELECT id, hotel_id, name, slug, display_order FROM pos_categories ORDER BY display_order ASC;";
            if (!string.IsNullOrWhiteSpace(filterHotelId))
            {
                var cleanH = CleanHotelId(filterHotelId);
                var filterGuidStr = GetDeterministicGuid(filterHotelId).ToString();
                catSql = $"SELECT id, hotel_id, name, slug, display_order FROM pos_categories WHERE hotel_id = '{cleanH}' OR hotel_id = '{filterHotelId}' OR hotel_id = '{filterGuidStr}' ORDER BY display_order ASC;";
            }

            var requestObj = new
            {
                requests = new[]
                {
                    new
                    {
                        type = "execute",
                        stmt = new { sql = catSql }
                    },
                    new
                    {
                        type = "execute",
                        stmt = new { sql = "SELECT id, category_id, name, description, price, is_available FROM pos_menu_items;" }
                    }
                }
            };

            var json = JsonSerializer.Serialize(requestObj);
            var request = new HttpRequestMessage(HttpMethod.Post, _tursoUrl);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _authToken);
            request.Content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(request);
            if (response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(body);
                var root = doc.RootElement;

                if (root.TryGetProperty("results", out var results) && results.GetArrayLength() >= 2)
                {
                    var catRes = results[0];
                    var itemRes = results[1];

                    var tempItems = new List<(string Id, string CatId, string Name, string Desc, decimal Price, bool Avail)>();
                    if (itemRes.TryGetProperty("response", out var iResp) &&
                        iResp.TryGetProperty("result", out var iResVal) &&
                        iResVal.TryGetProperty("rows", out var iRows))
                    {
                        foreach (var r in iRows.EnumerateArray())
                        {
                            var cols = r.EnumerateArray().ToList();
                            if (cols.Count >= 5)
                            {
                                var idStr = cols[0].TryGetProperty("value", out var v0) && v0.ValueKind == JsonValueKind.String ? v0.GetString() ?? "" : "";
                                var catIdStr = cols[1].TryGetProperty("value", out var v1) && v1.ValueKind == JsonValueKind.String ? v1.GetString() ?? "" : "";
                                var nameStr = cols[2].TryGetProperty("value", out var v2) && v2.ValueKind == JsonValueKind.String ? v2.GetString() ?? "" : "";
                                var descStr = cols.Count > 3 && cols[3].TryGetProperty("value", out var v3) && v3.ValueKind == JsonValueKind.String ? v3.GetString() ?? "" : "";
                                var priceVal = cols.Count > 4 ? ParseDecimal(cols[4]) : 0m;
                                bool avail = cols.Count > 5 ? ParseBoolValue(cols[5]) : true;

                                tempItems.Add((idStr, catIdStr, nameStr, descStr, priceVal, avail));
                            }
                        }
                    }

                    var categoriesList = new List<HotelSaaS.Application.DTOs.PosCategoryDto>();
                    if (catRes.TryGetProperty("response", out var cResp) &&
                        cResp.TryGetProperty("result", out var cResVal) &&
                        cResVal.TryGetProperty("rows", out var cRows))
                    {
                        foreach (var r in cRows.EnumerateArray())
                        {
                            var cols = r.EnumerateArray().ToList();
                            if (cols.Count >= 3)
                            {
                                var idStr = cols[0].TryGetProperty("value", out var v0) && v0.ValueKind == JsonValueKind.String ? v0.GetString() ?? "" : "";
                                var nameStr = cols[2].TryGetProperty("value", out var v2) && v2.ValueKind == JsonValueKind.String ? v2.GetString() ?? "" : "";
                                var slugStr = cols.Count > 3 && cols[3].TryGetProperty("value", out var v3) && v3.ValueKind == JsonValueKind.String ? v3.GetString() ?? "" : "";
                                var orderVal = cols.Count > 4 && cols[4].TryGetProperty("value", out var v4) && v4.ValueKind == JsonValueKind.Number ? v4.GetInt32() : 0;

                                var catGuid = GetDeterministicGuid(idStr);
                                var catItems = tempItems
                                    .Where(i => i.CatId.Equals(idStr, StringComparison.OrdinalIgnoreCase) || GetDeterministicGuid(i.CatId) == catGuid)
                                    .Select(i => new HotelSaaS.Application.DTOs.PosMenuItemDto(
                                        GetDeterministicGuid(i.Id),
                                        catGuid,
                                        nameStr,
                                        i.Name,
                                        i.Desc,
                                        i.Price,
                                        null,
                                        i.Avail
                                    ))
                                    .ToList();

                                categoriesList.Add(new HotelSaaS.Application.DTOs.PosCategoryDto(
                                    catGuid,
                                    nameStr,
                                    slugStr,
                                    orderVal,
                                    catItems
                                ));
                            }
                        }
                    }

                    if (categoriesList.Count > 0)
                    {
                        var mergedCategories = categoriesList
                            .GroupBy(c => c.Name.Trim(), StringComparer.OrdinalIgnoreCase)
                            .Select(g => {
                                var first = g.First();
                                var mergedItems = g.SelectMany(c => c.MenuItems)
                                    .GroupBy(i => i.Id)
                                    .Select(ig => ig.First())
                                    .ToList();
                                return new HotelSaaS.Application.DTOs.PosCategoryDto(
                                    first.Id,
                                    first.Name,
                                    first.Slug,
                                    first.DisplayOrder,
                                    mergedItems
                                );
                            })
                            .Where(c => c.MenuItems.Count > 0 || categoriesList.Count <= 4)
                            .ToList();

                        return mergedCategories.Count > 0 ? mergedCategories : categoriesList;
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to fetch POS menu from Turso Cloud");
        }

        return new List<HotelSaaS.Application.DTOs.PosCategoryDto>();
    }

    public async Task DeleteMenuItemFromTursoAsync(string idGuidOrRaw)
    {
        try
        {
            var safeId = (idGuidOrRaw ?? "").Trim().Replace("'", "''");

            // 1. Direct delete by exact string id
            await ExecuteSqlAsync($"DELETE FROM pos_menu_items WHERE id='{safeId}';");

            // 2. Query all pos_menu_items to match deterministic Guid
            var requestObj = new
            {
                requests = new[]
                {
                    new
                    {
                        type = "execute",
                        stmt = new { sql = "SELECT id FROM pos_menu_items;" }
                    }
                }
            };

            var json = JsonSerializer.Serialize(requestObj);
            var request = new HttpRequestMessage(HttpMethod.Post, _tursoUrl);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _authToken);
            request.Content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(request);
            if (response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(body);
                var root = doc.RootElement;
                if (root.TryGetProperty("results", out var results) && results.GetArrayLength() > 0 &&
                    results[0].TryGetProperty("response", out var respObj) &&
                    respObj.TryGetProperty("result", out var resVal) &&
                    resVal.TryGetProperty("rows", out var rowsArr))
                {
                    foreach (var row in rowsArr.EnumerateArray())
                    {
                        var cols = row.EnumerateArray().ToList();
                        if (cols.Count > 0)
                        {
                            var colObj = cols[0];
                            string rawId = "";
                            if (colObj.ValueKind == JsonValueKind.Object && colObj.TryGetProperty("value", out var v0))
                            {
                                rawId = v0.ValueKind == JsonValueKind.String ? v0.GetString() ?? "" : v0.ToString();
                            }
                            else if (colObj.ValueKind == JsonValueKind.String)
                            {
                                rawId = colObj.GetString() ?? "";
                            }

                            if (!string.IsNullOrWhiteSpace(rawId))
                            {
                                var rawGuidStr = GetDeterministicGuid(rawId).ToString();
                                if (rawId.Equals(safeId, StringComparison.OrdinalIgnoreCase) ||
                                    rawGuidStr.Equals(safeId, StringComparison.OrdinalIgnoreCase))
                                {
                                    await ExecuteSqlAsync($"DELETE FROM pos_menu_items WHERE id='{rawId.Replace("'", "''")}';");
                                }
                            }
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to delete POS menu item from Turso Cloud");
        }
    }

    public async Task UpdateMenuItemInTursoAsync(string idGuidOrRaw, string name, string description, decimal price, string categoryName, bool isAvailable)
    {
        try
        {
            var safeId = (idGuidOrRaw ?? "").Trim().Replace("'", "''");
            var safeName = (name ?? "").Replace("'", "''");
            var safeDesc = (description ?? "").Replace("'", "''");
            var safeCat = (categoryName ?? "").Replace("'", "''");
            var catId = $"cat-{safeCat.ToLower().Replace(" ", "-")}";

            var catSql = $"INSERT INTO pos_categories (id, trainid, hotel_id, name, slug, display_order) VALUES ('{catId}', (SELECT COALESCE(MAX(trainid), 0) + 1 FROM pos_categories), 'hotel-5', '{safeCat}', '{safeCat.ToLower().Replace(" ", "-")}', 1) ON CONFLICT(id) DO UPDATE SET name='{safeCat}';";
            await ExecuteSqlAsync(catSql);

            await ExecuteSqlAsync($"UPDATE pos_menu_items SET name='{safeName}', description='{safeDesc}', price={price}, is_available={(isAvailable ? 1 : 0)}, category_id='{catId}' WHERE id='{safeId}';");

            var requestObj = new
            {
                requests = new[]
                {
                    new
                    {
                        type = "execute",
                        stmt = new { sql = "SELECT id FROM pos_menu_items;" }
                    }
                }
            };

            var json = JsonSerializer.Serialize(requestObj);
            var request = new HttpRequestMessage(HttpMethod.Post, _tursoUrl);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _authToken);
            request.Content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(request);
            if (response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(body);
                var root = doc.RootElement;
                if (root.TryGetProperty("results", out var results) && results.GetArrayLength() > 0 &&
                    results[0].TryGetProperty("response", out var respObj) &&
                    respObj.TryGetProperty("result", out var resVal) &&
                    resVal.TryGetProperty("rows", out var rowsArr))
                {
                    foreach (var row in rowsArr.EnumerateArray())
                    {
                        var cols = row.EnumerateArray().ToList();
                        if (cols.Count > 0)
                        {
                            var colObj = cols[0];
                            string rawId = "";
                            if (colObj.ValueKind == JsonValueKind.Object && colObj.TryGetProperty("value", out var v0))
                            {
                                rawId = v0.ValueKind == JsonValueKind.String ? v0.GetString() ?? "" : v0.ToString();
                            }
                            else if (colObj.ValueKind == JsonValueKind.String)
                            {
                                rawId = colObj.GetString() ?? "";
                            }

                            if (!string.IsNullOrWhiteSpace(rawId))
                            {
                                var rawGuidStr = GetDeterministicGuid(rawId).ToString();
                                if (rawId.Equals(safeId, StringComparison.OrdinalIgnoreCase) ||
                                    rawGuidStr.Equals(safeId, StringComparison.OrdinalIgnoreCase))
                                {
                                    await ExecuteSqlAsync($"UPDATE pos_menu_items SET name='{safeName}', description='{safeDesc}', price={price}, is_available={(isAvailable ? 1 : 0)}, category_id='{catId}' WHERE id='{rawId.Replace("'", "''")}';");
                                }
                            }
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to update POS menu item in Turso Cloud");
        }
    }

    public async Task<List<HotelSaaS.Application.DTOs.ReservationDto>> FetchReservationsFromTursoAsync(string? filterHotelId = null)
    {
        try
        {
            var createTableLower = @"CREATE TABLE IF NOT EXISTS reservations (
                id TEXT PRIMARY KEY,
                trainid INTEGER DEFAULT 0,
                hotel_id TEXT,
                customer_id TEXT,
                room_id TEXT,
                check_in_date TEXT,
                check_out_date TEXT,
                adults INTEGER DEFAULT 1,
                children INTEGER DEFAULT 0,
                booking_status TEXT,
                total_amount NUMERIC DEFAULT 0,
                paid_amount NUMERIC DEFAULT 0,
                due_amount NUMERIC DEFAULT 0,
                payment_status TEXT DEFAULT 'Pending',
                booking_number TEXT,
                special_requests TEXT,
                created_at TEXT,
                updated_at TEXT
            );";
            await ExecuteSqlAsync(createTableLower);

            var sqlQuery = "SELECT r.id, r.check_in_date, r.check_out_date, r.adults, r.children, r.booking_status, r.total_amount, c.full_name, c.phone, c.email, rm.room_number, rt.name, r.hotel_id, r.paid_amount, r.due_amount, r.payment_status, r.booking_number, r.trainid FROM reservations r LEFT JOIN customers c ON r.customer_id = c.id LEFT JOIN rooms rm ON r.room_id = rm.id LEFT JOIN room_types rt ON rm.room_type_id = rt.id ORDER BY r.rowid DESC;";

            if (!string.IsNullOrWhiteSpace(filterHotelId))
            {
                var cleanH = CleanHotelId(filterHotelId);
                var filterGuidStr = GetDeterministicGuid(filterHotelId).ToString();
                sqlQuery = $"SELECT r.id, r.check_in_date, r.check_out_date, r.adults, r.children, r.booking_status, r.total_amount, c.full_name, c.phone, c.email, rm.room_number, rt.name, r.hotel_id, r.paid_amount, r.due_amount, r.payment_status, r.booking_number, r.trainid FROM reservations r LEFT JOIN customers c ON r.customer_id = c.id LEFT JOIN rooms rm ON r.room_id = rm.id LEFT JOIN room_types rt ON rm.room_type_id = rt.id WHERE r.hotel_id = '{cleanH}' OR r.hotel_id = '{filterHotelId}' OR r.hotel_id = '{filterGuidStr}' ORDER BY r.rowid DESC;";
            }

            var requestObj = new
            {
                requests = new[]
                {
                    new
                    {
                        type = "execute",
                        stmt = new { sql = sqlQuery }
                    }
                }
            };

            var json = JsonSerializer.Serialize(requestObj);
            var request = new HttpRequestMessage(HttpMethod.Post, _tursoUrl);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _authToken);
            request.Content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(request);
            if (response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(body);
                var root = doc.RootElement;

                var list = new List<HotelSaaS.Application.DTOs.ReservationDto>();
                if (root.TryGetProperty("results", out var results) && results.GetArrayLength() > 0)
                {
                    var firstResult = results[0];
                    if (firstResult.TryGetProperty("response", out var respObj) &&
                        respObj.TryGetProperty("result", out var resVal) &&
                        resVal.TryGetProperty("rows", out var rowsArr))
                    {
                        foreach (var row in rowsArr.EnumerateArray())
                        {
                            var cols = row.EnumerateArray().ToList();
                            if (cols.Count >= 7)
                            {
                                var idStr = GetStringVal(cols[0]);
                                var checkInStr = GetStringVal(cols[1], "2026-09-18 00:32:57");
                                var checkOutStr = GetStringVal(cols[2], "2026-09-18 00:32:57");
                                
                                var adults = cols.Count > 3 ? (int)ParseLong(cols[3]) : 2;
                                var children = cols.Count > 4 ? (int)ParseLong(cols[4]) : 0;
                                var bookStatusStr = cols.Count > 5 ? GetStringVal(cols[5], "Confirmed") : "Confirmed";
                                var totalAmt = cols.Count > 6 ? ParseDecimal(cols[6]) : 5000m;

                                var rawCustName = cols.Count > 7 ? GetStringVal(cols[7]) : null;
                                var rawCustPhone = cols.Count > 8 ? GetStringVal(cols[8]) : null;
                                var rawCustEmail = cols.Count > 9 ? GetStringVal(cols[9]) : null;
                                var rawRoomNum = cols.Count > 10 ? GetStringVal(cols[10]) : null;
                                var rawRoomType = cols.Count > 11 ? GetStringVal(cols[11]) : null;
                                var rawHotelId = cols.Count > 12 ? GetStringVal(cols[12], "hotel-5") : "hotel-5";

                                var paidAmt = cols.Count > 13 ? ParseDecimal(cols[13]) : 0m;
                                var dueAmt = cols.Count > 14 ? ParseDecimal(cols[14]) : (totalAmt - paidAmt);
                                var payStatusStr = cols.Count > 15 ? GetStringVal(cols[15], "Pending") : "Pending";
                                var dbBookingNum = cols.Count > 16 ? GetStringVal(cols[16]) : null;

                                if (paidAmt == 0 && payStatusStr.Equals("Paid", StringComparison.OrdinalIgnoreCase))
                                {
                                    paidAmt = totalAmt;
                                    dueAmt = 0;
                                }

                                var custName = string.IsNullOrWhiteSpace(rawCustName) ? "Guest" : rawCustName;
                                var custPhone = string.IsNullOrWhiteSpace(rawCustPhone) ? "N/A" : rawCustPhone;
                                var custEmail = string.IsNullOrWhiteSpace(rawCustEmail) ? "" : rawCustEmail;
                                var roomNum = string.IsNullOrWhiteSpace(rawRoomNum) ? "101" : rawRoomNum;
                                var roomTypeName = string.IsNullOrWhiteSpace(rawRoomType) ? "Deluxe Room" : rawRoomType;

                                var parsedCheckIn = ParseDateTime(checkInStr, new DateTime(2026, 9, 18, 0, 32, 0));
                                var parsedCheckOut = ParseDateTime(checkOutStr, new DateTime(2026, 9, 19, 11, 0, 0));

                                Enum.TryParse<HotelSaaS.Domain.Enums.BookingStatus>(bookStatusStr, true, out var parsedBookStatus);
                                Enum.TryParse<HotelSaaS.Domain.Enums.PaymentStatus>(payStatusStr, true, out var parsedPayStatus);

                                var bookingNum = string.IsNullOrWhiteSpace(dbBookingNum) ? (string.IsNullOrWhiteSpace(idStr) ? "BK-1001" : idStr) : dbBookingNum;
                                if (bookingNum.StartsWith("res-", StringComparison.OrdinalIgnoreCase))
                                {
                                    bookingNum = "BK-" + bookingNum.Substring(4);
                                }
                                var idGuid = GetDeterministicGuid(idStr);
                                var hotelGuid = GetDeterministicGuid(string.IsNullOrWhiteSpace(rawHotelId) ? "hotel-001" : rawHotelId);

                                list.Add(new HotelSaaS.Application.DTOs.ReservationDto(
                                    idGuid,
                                    hotelGuid,
                                    bookingNum,
                                    GetDeterministicGuid("customer-001"),
                                    custName,
                                    custPhone,
                                    custEmail,
                                    GetDeterministicGuid("room-001"),
                                    roomNum,
                                    roomTypeName,
                                    parsedCheckIn,
                                    parsedCheckOut,
                                    adults, children, totalAmt, 0, 0, totalAmt, paidAmt, dueAmt,
                                    parsedPayStatus, parsedBookStatus, "Direct Walk-In", "", DateTime.UtcNow
                                ));
                            }
                        }
                    }
                }
                return list;
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to fetch reservations live from Turso Cloud");
        }
        return new List<HotelSaaS.Application.DTOs.ReservationDto>();
    }

    public async Task<List<HotelSaaS.Application.DTOs.StaffDto>> FetchStaffFromTursoAsync(string? filterHotelId = null)
    {
        try
        {
            var createTableLower = @"CREATE TABLE IF NOT EXISTS staffs (
                id TEXT PRIMARY KEY,
                trainid INTEGER DEFAULT 0,
                hotel_id TEXT,
                hotel_code TEXT,
                first_name TEXT,
                last_name TEXT,
                full_name TEXT,
                mobile TEXT,
                email TEXT,
                address TEXT,
                role TEXT,
                department TEXT,
                joining_date TEXT,
                salary NUMERIC,
                status TEXT,
                profile_image TEXT,
                created_at TEXT,
                updated_at TEXT
            );";
            await ExecuteSqlAsync(createTableLower);

            var sqlQuery = "SELECT id, hotel_id, first_name, last_name, full_name, mobile, email, address, role, department, salary, status FROM staffs ORDER BY first_name ASC;";

            if (!string.IsNullOrWhiteSpace(filterHotelId))
            {
                var cleanH = CleanHotelId(filterHotelId);
                var filterGuidStr = GetDeterministicGuid(filterHotelId).ToString();
                sqlQuery = $"SELECT id, hotel_id, first_name, last_name, full_name, mobile, email, address, role, department, salary, status FROM staffs WHERE hotel_id = '{cleanH}' OR hotel_id = '{filterHotelId}' OR hotel_id = '{filterGuidStr}' ORDER BY first_name ASC;";
            }

            var requestObj = new
            {
                requests = new[]
                {
                    new
                    {
                        type = "execute",
                        stmt = new { sql = sqlQuery }
                    }
                }
            };

            var json = JsonSerializer.Serialize(requestObj);
            var request = new HttpRequestMessage(HttpMethod.Post, _tursoUrl);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _authToken);
            request.Content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(request);
            if (response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(body);
                var root = doc.RootElement;

                var list = new List<HotelSaaS.Application.DTOs.StaffDto>();
                if (root.TryGetProperty("results", out var results) && results.GetArrayLength() > 0 &&
                    results[0].TryGetProperty("response", out var respObj) &&
                    respObj.TryGetProperty("result", out var resVal) &&
                    resVal.TryGetProperty("rows", out var rowsArr))
                {
                    foreach (var row in rowsArr.EnumerateArray())
                    {
                        var cols = row.EnumerateArray().ToList();
                        if (cols.Count >= 7)
                        {
                            var idStr = cols[0].TryGetProperty("value", out var v0) && v0.ValueKind == JsonValueKind.String ? (v0.GetString() ?? "") : "";
                            var hotelIdStr = cols[1].TryGetProperty("value", out var v1) && v1.ValueKind == JsonValueKind.String ? (v1.GetString() ?? "") : "";
                            var firstName = cols[2].TryGetProperty("value", out var v2) && v2.ValueKind == JsonValueKind.String ? (v2.GetString() ?? "") : "";
                            var lastName = cols[3].TryGetProperty("value", out var v3) && v3.ValueKind == JsonValueKind.String ? (v3.GetString() ?? "") : "";
                            var fullName = cols[4].TryGetProperty("value", out var v4) && v4.ValueKind == JsonValueKind.String ? (v4.GetString() ?? "") : $"{firstName} {lastName}".Trim();
                            var mobile = cols[5].TryGetProperty("value", out var v5) && v5.ValueKind == JsonValueKind.String ? (v5.GetString() ?? "") : "";
                            var email = cols[6].TryGetProperty("value", out var v6) && v6.ValueKind == JsonValueKind.String ? (v6.GetString() ?? "") : "";
                            var address = cols.Count > 7 && cols[7].TryGetProperty("value", out var v7) && v7.ValueKind == JsonValueKind.String ? (v7.GetString() ?? "") : "";
                            var role = cols.Count > 8 && cols[8].TryGetProperty("value", out var v8) && v8.ValueKind == JsonValueKind.String ? (v8.GetString() ?? "Staff") : "Staff";
                            var department = cols.Count > 9 && cols[9].TryGetProperty("value", out var v9) && v9.ValueKind == JsonValueKind.String ? (v9.GetString() ?? "General") : "General";
                            var salary = cols.Count > 10 ? ParseDecimal(cols[10]) : 0m;
                            var status = cols.Count > 11 && cols[11].TryGetProperty("value", out var v11) && v11.ValueKind == JsonValueKind.String ? (v11.GetString() ?? "Active") : "Active";

                            Guid.TryParse(idStr, out var idGuid);
                            if (idGuid == Guid.Empty) idGuid = GetDeterministicGuid(idStr);

                            Guid.TryParse(hotelIdStr, out var hotelGuid);
                            if (hotelGuid == Guid.Empty) hotelGuid = GetDeterministicGuid(string.IsNullOrWhiteSpace(hotelIdStr) ? "hotel-1" : hotelIdStr);

                            list.Add(new HotelSaaS.Application.DTOs.StaffDto(
                                idGuid, hotelGuid, firstName, lastName, fullName, mobile, email, address, role, department, DateTime.UtcNow, salary, status, null, DateTime.UtcNow
                            ));
                        }
                    }
                }
                return list;
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to fetch staff live from Turso Cloud");
        }
        return new List<HotelSaaS.Application.DTOs.StaffDto>();
    }

    public async Task<List<HotelSaaS.Application.DTOs.ExpenseDto>> FetchExpensesFromTursoAsync(string? filterHotelId = null)
    {
        try
        {
            var createTableLower = @"CREATE TABLE IF NOT EXISTS expenses (
                id TEXT PRIMARY KEY,
                trainid INTEGER DEFAULT 0,
                hotel_id TEXT,
                hotel_code TEXT,
                category TEXT,
                amount NUMERIC,
                description TEXT,
                expense_date TEXT,
                payment_method TEXT,
                reference_number TEXT,
                created_by TEXT,
                receipt_url TEXT,
                created_at TEXT,
                updated_at TEXT
            );";
            await ExecuteSqlAsync(createTableLower);
            try { await ExecuteSqlAsync("ALTER TABLE expenses ADD COLUMN reference_number TEXT;"); } catch { }
            try { await ExecuteSqlAsync("ALTER TABLE expenses ADD COLUMN created_by TEXT;"); } catch { }
            try { await ExecuteSqlAsync("ALTER TABLE expenses ADD COLUMN receipt_url TEXT;"); } catch { }

            var sqlQuery = "SELECT id, hotel_id, category, amount, description, expense_date, payment_method, reference_number, created_by FROM expenses ORDER BY rowid DESC;";

            if (!string.IsNullOrWhiteSpace(filterHotelId))
            {
                var cleanH = CleanHotelId(filterHotelId);
                var filterGuidStr = GetDeterministicGuid(filterHotelId).ToString();
                sqlQuery = $"SELECT id, hotel_id, category, amount, description, expense_date, payment_method, reference_number, created_by FROM expenses WHERE hotel_id = '{cleanH}' OR hotel_id = '{filterHotelId}' OR hotel_id = '{filterGuidStr}' ORDER BY rowid DESC;";
            }

            var requestObj = new
            {
                requests = new[]
                {
                    new
                    {
                        type = "execute",
                        stmt = new { sql = sqlQuery }
                    }
                }
            };

            var json = JsonSerializer.Serialize(requestObj);
            var request = new HttpRequestMessage(HttpMethod.Post, _tursoUrl);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _authToken);
            request.Content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(request);
            if (response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(body);
                var root = doc.RootElement;

                var list = new List<HotelSaaS.Application.DTOs.ExpenseDto>();
                if (root.TryGetProperty("results", out var results) && results.GetArrayLength() > 0 &&
                    results[0].TryGetProperty("response", out var respObj) &&
                    respObj.TryGetProperty("result", out var resVal) &&
                    resVal.TryGetProperty("rows", out var rowsArr))
                {
                    Guid defaultHotel = Guid.Parse("00000000-0000-0000-0000-000000000001");

                    foreach (var row in rowsArr.EnumerateArray())
                    {
                        var cols = row.EnumerateArray().ToList();
                        if (cols.Count >= 4)
                        {
                            var idStr = cols[0].GetProperty("value").GetString() ?? "";
                            var hotelIdStr = cols[1].GetProperty("value").GetString() ?? "";
                            var category = cols[2].GetProperty("value").GetString() ?? "General";
                            var amount = ParseDecimal(cols[3].GetProperty("value"));
                            var desc = cols.Count > 4 && cols[4].GetProperty("value").ValueKind == JsonValueKind.String ? cols[4].GetProperty("value").GetString() : "";
                            var expDateStr = cols.Count > 5 && cols[5].GetProperty("value").ValueKind == JsonValueKind.String ? cols[5].GetProperty("value").GetString() : null;
                            var method = cols.Count > 6 && cols[6].GetProperty("value").ValueKind == JsonValueKind.String ? cols[6].GetProperty("value").GetString() ?? "Cash" : "Cash";
                            var refNum = cols.Count > 7 && cols[7].GetProperty("value").ValueKind == JsonValueKind.String ? cols[7].GetProperty("value").GetString() : null;
                            var createdBy = cols.Count > 8 && cols[8].GetProperty("value").ValueKind == JsonValueKind.String ? cols[8].GetProperty("value").GetString() : null;

                            Guid.TryParse(idStr, out var idGuid);
                            if (idGuid == Guid.Empty) idGuid = GetDeterministicGuid(idStr);

                            Guid.TryParse(hotelIdStr, out var hotelGuid);
                            if (hotelGuid == Guid.Empty)
                            {
                                hotelGuid = GetDeterministicGuid(string.IsNullOrWhiteSpace(hotelIdStr) ? "hotel-1" : hotelIdStr);
                            }

                            DateTime.TryParse(expDateStr, out var parsedDate);
                            if (parsedDate == default) parsedDate = DateTime.UtcNow;

                            list.Add(new HotelSaaS.Application.DTOs.ExpenseDto(
                                idGuid, hotelGuid, category, amount, desc ?? "", parsedDate, method, refNum, createdBy, null, parsedDate
                            ));
                        }
                    }
                }
                return list;
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to fetch expenses live from Turso Cloud");
        }
        return new List<HotelSaaS.Application.DTOs.ExpenseDto>();
    }

    public async Task<HotelSaaS.Domain.Entities.Profile?> FetchProfileByEmailFromTursoAsync(string email)
    {
        if (string.IsNullOrWhiteSpace(email)) return null;
        var normalized = email.Trim().ToLower().Replace("'", "''");
        try
        {
            var requestObj = new
            {
                requests = new[]
                {
                    new
                    {
                        type = "execute",
                        stmt = new { sql = $"SELECT Id, Email, PasswordHash, StaffPasswordHash, FullName, Role, Status, HotelId, HotelCode, IsSuperAdmin FROM Profiles WHERE LOWER(Email) = '{normalized}';" }
                    }
                }
            };

            var json = JsonSerializer.Serialize(requestObj);
            var request = new HttpRequestMessage(HttpMethod.Post, _tursoUrl);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _authToken);
            request.Content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(request);
            if (response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(body);
                var root = doc.RootElement;

                if (root.TryGetProperty("results", out var results) && results.GetArrayLength() > 0)
                {
                    var firstResult = results[0];
                    if (firstResult.TryGetProperty("response", out var respObj) &&
                        respObj.TryGetProperty("result", out var resVal) &&
                        resVal.TryGetProperty("rows", out var rowsArr) &&
                        rowsArr.GetArrayLength() > 0)
                    {
                        var row = rowsArr[0].EnumerateArray().ToList();
                        var idStr = row[0].GetProperty("value").ValueKind == JsonValueKind.String ? row[0].GetProperty("value").GetString() ?? "" : "";
                        var emailStr = row[1].GetProperty("value").ValueKind == JsonValueKind.String ? row[1].GetProperty("value").GetString() ?? "" : "";
                        var pwdHash = row[2].GetProperty("value").ValueKind == JsonValueKind.String ? row[2].GetProperty("value").GetString() ?? "" : "";
                        var staffPwdHash = row.Count > 3 && row[3].GetProperty("value").ValueKind == JsonValueKind.String ? row[3].GetProperty("value").GetString() : null;
                        var fullName = row.Count > 4 && row[4].GetProperty("value").ValueKind == JsonValueKind.String ? row[4].GetProperty("value").GetString() ?? "" : "";
                        var roleStr = row.Count > 5 && row[5].GetProperty("value").ValueKind == JsonValueKind.String ? row[5].GetProperty("value").GetString() ?? "HotelOwner" : "HotelOwner";
                        
                        bool statusBool = row.Count > 6 && ParseBoolValue(row[6]);
                        var hotelIdStr = row.Count > 7 && row[7].TryGetProperty("value", out var hVal) && hVal.ValueKind == JsonValueKind.String ? hVal.GetString() : null;
                        var hotelCodeStr = row.Count > 8 && row[8].TryGetProperty("value", out var hcVal) && hcVal.ValueKind == JsonValueKind.String ? hcVal.GetString() : null;
                        bool isSuperAdmin = row.Count > 9 && ParseBoolValue(row[9]);

                        Guid.TryParse(idStr, out var idGuid);
                        if (idGuid == Guid.Empty) idGuid = GetDeterministicGuid(idStr);

                        Guid.TryParse(hotelIdStr, out var hotelGuid);
                        if (hotelGuid == Guid.Empty && !string.IsNullOrWhiteSpace(hotelIdStr))
                        {
                            hotelGuid = GetDeterministicGuid(hotelIdStr);
                        }

                        Enum.TryParse<HotelSaaS.Domain.Enums.UserRole>(roleStr, true, out var parsedRole);

                        return new HotelSaaS.Domain.Entities.Profile
                        {
                            Id = idGuid,
                            Email = emailStr,
                            PasswordHash = pwdHash,
                            StaffPasswordHash = staffPwdHash,
                            FullName = fullName,
                            Role = parsedRole,
                            Status = statusBool,
                            HotelId = hotelGuid != Guid.Empty ? hotelGuid : null,
                            HotelCode = hotelCodeStr,
                            IsSuperAdmin = isSuperAdmin
                        };
                    }
                }
            }

            // Fallback: Check staffs table if email is not found in Profiles table
            var staffRequestObj = new
            {
                requests = new[]
                {
                    new
                    {
                        type = "execute",
                        stmt = new { sql = $"SELECT id, full_name, email, role, hotel_id FROM staffs WHERE LOWER(email) = '{normalized}';" }
                    }
                }
            };

            var staffJson = JsonSerializer.Serialize(staffRequestObj);
            var staffReq = new HttpRequestMessage(HttpMethod.Post, _tursoUrl);
            staffReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _authToken);
            staffReq.Content = new StringContent(staffJson, Encoding.UTF8, "application/json");

            var staffResp = await _httpClient.SendAsync(staffReq);
            if (staffResp.IsSuccessStatusCode)
            {
                var sBody = await staffResp.Content.ReadAsStringAsync();
                using var sDoc = JsonDocument.Parse(sBody);
                var sRoot = sDoc.RootElement;
                if (sRoot.TryGetProperty("results", out var sResults) && sResults.GetArrayLength() > 0 &&
                    sResults[0].TryGetProperty("response", out var sRespObj) &&
                    sRespObj.TryGetProperty("result", out var sResVal) &&
                    sResVal.TryGetProperty("rows", out var sRowsArr) &&
                    sRowsArr.GetArrayLength() > 0)
                {
                    var row = sRowsArr[0].EnumerateArray().ToList();
                    var idStr = row[0].TryGetProperty("value", out var v0) && v0.ValueKind == JsonValueKind.String ? v0.GetString() ?? "" : "";
                    var fullName = row.Count > 1 && row[1].TryGetProperty("value", out var v1) && v1.ValueKind == JsonValueKind.String ? v1.GetString() ?? "" : "";
                    var emailStr = row.Count > 2 && row[2].TryGetProperty("value", out var v2) && v2.ValueKind == JsonValueKind.String ? v2.GetString() ?? "" : normalized;
                    var roleStr = row.Count > 3 && row[3].TryGetProperty("value", out var v3) && v3.ValueKind == JsonValueKind.String ? v3.GetString() ?? "Staff" : "Staff";
                    var hotelIdStr = row.Count > 4 && row[4].TryGetProperty("value", out var v4) && v4.ValueKind == JsonValueKind.String ? v4.GetString() : null;

                    var idGuid = GetDeterministicGuid(idStr);
                    var hotelGuid = GetDeterministicGuid(hotelIdStr ?? "hotel-1");

                    return new HotelSaaS.Domain.Entities.Profile
                    {
                        Id = idGuid,
                        Email = emailStr,
                        PasswordHash = "",
                        StaffPasswordHash = "",
                        FullName = fullName,
                        Role = HotelSaaS.Domain.Enums.UserRole.StaffManager,
                        Status = true,
                        HotelId = hotelGuid
                    };
                }
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to fetch profile directly from Turso Cloud DB for email: {Email}", email);
        }
        return null;
    }

    public async Task<HotelSaaS.Domain.Entities.Hotel?> FetchHotelByIdFromTursoAsync(Guid hotelId)
    {
        try
        {
            var cleanHId = hotelId.ToString().StartsWith("00000000-0000-0000-0000-")
                ? $"hotel-{int.Parse(hotelId.ToString().Substring("00000000-0000-0000-0000-".Length))}"
                : hotelId.ToString();

            var requestObj = new
            {
                requests = new[]
                {
                    new
                    {
                        type = "execute",
                        stmt = new { sql = $"SELECT id, name, slug, phone, email, address, city, state, country, pincode, gst_number, tax_rate, bank_name, account_no, ifsc_code, upi_id, status, hotel_code, wifi_name, wifi_password, review_url FROM hotels WHERE id = '{hotelId}' OR id = '{cleanHId}';" }
                    }
                }
            };

            var json = JsonSerializer.Serialize(requestObj);
            var request = new HttpRequestMessage(HttpMethod.Post, _tursoUrl);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _authToken);
            request.Content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(request);
            if (response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(body);
                var root = doc.RootElement;

                if (root.TryGetProperty("results", out var results) && results.GetArrayLength() > 0 &&
                    results[0].TryGetProperty("response", out var respObj) &&
                    respObj.TryGetProperty("result", out var resVal) &&
                    resVal.TryGetProperty("rows", out var rowsArr) &&
                    rowsArr.GetArrayLength() > 0)
                {
                    var cols = rowsArr[0].EnumerateArray().ToList();
                    var nameStr = cols.Count > 1 && cols[1].TryGetProperty("value", out var nV) && nV.ValueKind == JsonValueKind.String ? nV.GetString() ?? "" : "";
                    var slugStr = cols.Count > 2 && cols[2].TryGetProperty("value", out var sV) && sV.ValueKind == JsonValueKind.String ? sV.GetString() ?? "" : "";
                    var phoneStr = cols.Count > 3 && cols[3].TryGetProperty("value", out var pV) && pV.ValueKind == JsonValueKind.String ? pV.GetString() : null;
                    var emailStr = cols.Count > 4 && cols[4].TryGetProperty("value", out var eV) && eV.ValueKind == JsonValueKind.String ? eV.GetString() : null;
                    var addrStr = cols.Count > 5 && cols[5].TryGetProperty("value", out var aV) && aV.ValueKind == JsonValueKind.String ? aV.GetString() : null;
                    var cityStr = cols.Count > 6 && cols[6].TryGetProperty("value", out var ctV) && ctV.ValueKind == JsonValueKind.String ? ctV.GetString() : null;
                    var stateStr = cols.Count > 7 && cols[7].TryGetProperty("value", out var sttV) && sttV.ValueKind == JsonValueKind.String ? sttV.GetString() : null;
                    var countryStr = cols.Count > 8 && cols[8].TryGetProperty("value", out var cntV) && cntV.ValueKind == JsonValueKind.String ? cntV.GetString() : null;
                    var pincodeStr = cols.Count > 9 && cols[9].TryGetProperty("value", out var pinV) && pinV.ValueKind == JsonValueKind.String ? pinV.GetString() : null;
                    var gstStr = cols.Count > 10 && cols[10].TryGetProperty("value", out var gstV) && gstV.ValueKind == JsonValueKind.String ? gstV.GetString() : null;
                    var taxRateStr = cols.Count > 11 && cols[11].TryGetProperty("value", out var trV) && trV.ValueKind == JsonValueKind.String ? trV.GetString() : null;
                    var bankStr = cols.Count > 12 && cols[12].TryGetProperty("value", out var bkV) && bkV.ValueKind == JsonValueKind.String ? bkV.GetString() : null;
                    var accStr = cols.Count > 13 && cols[13].TryGetProperty("value", out var accV) && accV.ValueKind == JsonValueKind.String ? accV.GetString() : null;
                    var ifscStr = cols.Count > 14 && cols[14].TryGetProperty("value", out var ifscV) && ifscV.ValueKind == JsonValueKind.String ? ifscV.GetString() : null;
                    var upiStr = cols.Count > 15 && cols[15].TryGetProperty("value", out var upiV) && upiV.ValueKind == JsonValueKind.String ? upiV.GetString() : null;
                    var statusStr = cols.Count > 16 && cols[16].TryGetProperty("value", out var stV) && stV.ValueKind == JsonValueKind.String ? stV.GetString() ?? "Active" : "Active";
                    var codeStr = cols.Count > 17 && cols[17].TryGetProperty("value", out var cV) && cV.ValueKind == JsonValueKind.String ? cV.GetString() : null;
                    var wifiNameStr = cols.Count > 18 && cols[18].TryGetProperty("value", out var wnV) && wnV.ValueKind == JsonValueKind.String ? wnV.GetString() : null;
                    var wifiPasswordStr = cols.Count > 19 && cols[19].TryGetProperty("value", out var wpV) && wpV.ValueKind == JsonValueKind.String ? wpV.GetString() : null;
                    var reviewUrlStr = cols.Count > 20 && cols[20].TryGetProperty("value", out var rvV) && rvV.ValueKind == JsonValueKind.String ? rvV.GetString() : null;

                    return new HotelSaaS.Domain.Entities.Hotel
                    {
                        Id = hotelId,
                        Name = nameStr,
                        Slug = slugStr,
                        Phone = phoneStr ?? "",
                        Email = emailStr ?? "",
                        Address = addrStr ?? "",
                        City = cityStr ?? "",
                        State = stateStr ?? "",
                        Country = countryStr ?? "India",
                        Pincode = pincodeStr ?? "",
                        GstNumber = gstStr,
                        TaxRate = taxRateStr ?? "12%",
                        BankName = bankStr ?? "HDFC Bank",
                        AccountNo = accStr ?? "50100293847162",
                        IfscCode = ifscStr ?? "HDFC0000123",
                        UpiId = upiStr ?? "grandpalace@upi",
                        Status = statusStr,
                        HotelCode = codeStr ?? "HTL-001",
                        WifiName = wifiNameStr ?? "Hotel_Guest_WiFi",
                        WifiPassword = wifiPasswordStr ?? "Welcome2026",
                        ReviewUrl = reviewUrlStr ?? "https://g.page/r/your-hotel-review"
                    };
                }
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to fetch hotel directly from Turso Cloud DB for ID: {HotelId}", hotelId);
        }
        return null;
    }

    public async Task SyncProfileAsync(string id, string fullName, string email, string? phone, string passwordHash, bool isSuperAdmin, bool status = false, Guid? hotelId = null, string? role = null, string? staffPasswordHash = null, long trainId = 0)
    {
        var pId = CleanProfileId(id, email);
        var safePhone = (phone ?? "").Replace("'", "''");
        var hId = CleanHotelId(hotelId?.ToString());
        var roleVal = role ?? "0";
        var statusVal = status ? 1 : 0;
        var superAdminVal = isSuperAdmin ? 1 : 0;

        string sql;
        if (trainId > 0)
        {
            sql = $@"INSERT INTO Profiles (trainid, Id, FullName, Email, Phone, PasswordHash, IsSuperAdmin, HotelId, Role, Status) 
VALUES ({trainId}, '{pId}', '{fullName.Replace("'", "''")}', '{email.Replace("'", "''")}', '{safePhone}', '{passwordHash.Replace("'", "''")}', {superAdminVal}, '{hId}', '{roleVal}', {statusVal})
ON CONFLICT(Email) DO UPDATE SET trainid = {trainId}, Id = '{pId}', FullName = '{fullName.Replace("'", "''")}', Phone = '{safePhone}', PasswordHash = '{passwordHash.Replace("'", "''")}', HotelId = '{hId}', Role = '{roleVal}', Status = {statusVal};";
        }
        else
        {
            sql = $@"INSERT INTO Profiles (Id, FullName, Email, Phone, PasswordHash, IsSuperAdmin, HotelId, Role, Status) 
VALUES ('{pId}', '{fullName.Replace("'", "''")}', '{email.Replace("'", "''")}', '{safePhone}', '{passwordHash.Replace("'", "''")}', {superAdminVal}, '{hId}', '{roleVal}', {statusVal})
ON CONFLICT(Email) DO UPDATE SET Id = '{pId}', FullName = '{fullName.Replace("'", "''")}', Phone = '{safePhone}', PasswordHash = '{passwordHash.Replace("'", "''")}', HotelId = '{hId}', Role = '{roleVal}', Status = {statusVal};";
        }

        await ExecuteSqlAsync(sql);

        if (!string.IsNullOrEmpty(staffPasswordHash))
        {
            try
            {
                var extendedSql = $"UPDATE Profiles SET StaffPasswordHash = '{staffPasswordHash.Replace("'", "''")}' WHERE Email = '{email.Replace("'", "''")}';";
                await ExecuteSqlAsync(extendedSql);
            }
            catch { }
        }
    }

    public async Task SyncHotelAsync(string id, string name, string slug, string? phone, string? email, string? address, string? city, string? state, string? country, string? pincode, string status, string? hotelCode = null, string? gstNumber = null, string? taxRate = null, string? bankName = null, string? accountNo = null, string? ifscCode = null, string? upiId = null, string? wifiName = null, string? wifiPassword = null, string? reviewUrl = null, long trainId = 0)
    {
        var hId = CleanHotelId(id);
        var safeName = (name ?? "Hotel").Replace("'", "''");
        var safePhone = (phone ?? "").Replace("'", "''");
        var safeEmail = (email ?? "").Replace("'", "''");
        var safeAddr = (address ?? "").Replace("'", "''");
        var safeCity = (city ?? "").Replace("'", "''");
        var safeState = (state ?? "").Replace("'", "''");
        var safeCountry = (country ?? "India").Replace("'", "''");
        var safePin = (pincode ?? "").Replace("'", "''");
        var safeStatus = (status ?? "PendingApproval").Replace("'", "''");
        var safeGst = (gstNumber ?? "").Replace("'", "''");
        var safeTax = (taxRate ?? "12%").Replace("'", "''");
        var safeBank = (bankName ?? "").Replace("'", "''");
        var safeAcc = (accountNo ?? "").Replace("'", "''");
        var safeIfsc = (ifscCode ?? "").Replace("'", "''");
        var safeUpi = (upiId ?? "").Replace("'", "''");
        var safeWifiName = (wifiName ?? "Hotel_Guest_WiFi").Replace("'", "''");
        var safeWifiPass = (wifiPassword ?? "Welcome2026").Replace("'", "''");
        var safeReviewUrl = (reviewUrl ?? "https://g.page/r/your-hotel-review").Replace("'", "''");

        // 1. Guaranteed base insert into hotels table
        string baseSql;
        if (trainId > 0)
        {
            baseSql = $@"INSERT INTO hotels (trainid, id, name, status, wifi_name, wifi_password, review_url) VALUES ({trainId}, '{hId}', '{safeName}', '{safeStatus}', '{safeWifiName}', '{safeWifiPass}', '{safeReviewUrl}') ON CONFLICT(id) DO UPDATE SET trainid = {trainId}, name = '{safeName}', status = '{safeStatus}', wifi_name = '{safeWifiName}', wifi_password = '{safeWifiPass}', review_url = '{safeReviewUrl}';";
        }
        else
        {
            baseSql = $@"INSERT INTO hotels (id, name, status, wifi_name, wifi_password, review_url) VALUES ('{hId}', '{safeName}', '{safeStatus}', '{safeWifiName}', '{safeWifiPass}', '{safeReviewUrl}') ON CONFLICT(id) DO UPDATE SET name = '{safeName}', status = '{safeStatus}', wifi_name = '{safeWifiName}', wifi_password = '{safeWifiPass}', review_url = '{safeReviewUrl}';";
        }
        await ExecuteSqlAsync(baseSql);

        // 2. Try extended columns update if available in Turso table schema
        try
        {
            var extendedSql = $@"UPDATE hotels SET email = '{safeEmail}', phone = '{safePhone}', address = '{safeAddr}', city = '{safeCity}', state = '{safeState}', country = '{safeCountry}', pincode = '{safePin}', gst_number = '{safeGst}', tax_rate = '{safeTax}', bank_name = '{safeBank}', account_no = '{safeAcc}', ifsc_code = '{safeIfsc}', upi_id = '{safeUpi}', wifi_name = '{safeWifiName}', wifi_password = '{safeWifiPass}', review_url = '{safeReviewUrl}' WHERE id = '{hId}';";
            await ExecuteSqlAsync(extendedSql);
        }
        catch { }
    }

    public async Task SyncStaffAsync(string id, string firstName, string lastName, string fullName, string mobile, string email, string? address, string role, string department, decimal salary, string status, string? hotelId = null)
    {
        var sId = CleanStaffId(id);
        var hId = CleanHotelId(hotelId);
        var safeFirst = (firstName ?? "").Replace("'", "''");
        var safeLast = (lastName ?? "").Replace("'", "''");
        var safeFull = (fullName ?? "").Replace("'", "''");
        var safeMobile = (mobile ?? "").Replace("'", "''");
        var safeEmail = (email ?? "").Replace("'", "''");
        var safeAddr = (address ?? "").Replace("'", "''");
        var safeRole = (role ?? "Staff").Replace("'", "''");
        var safeDept = (department ?? "General").Replace("'", "''");
        var safeStatus = (status ?? "Active").Replace("'", "''");

        var nowIso = DateTime.UtcNow.ToString("o");

        // Lowercase snake_case table 'staffs' (for Drizzle Studio / Turso App)
        var createTableLower = @"CREATE TABLE IF NOT EXISTS staffs (
            id TEXT PRIMARY KEY,
            trainid INTEGER DEFAULT 0,
            hotel_id TEXT,
            hotel_code TEXT,
            first_name TEXT,
            last_name TEXT,
            full_name TEXT,
            mobile TEXT,
            email TEXT,
            address TEXT,
            role TEXT,
            department TEXT,
            joining_date TEXT,
            salary NUMERIC,
            status TEXT,
            profile_image TEXT,
            created_at TEXT,
            updated_at TEXT
        );";
        await ExecuteSqlAsync(createTableLower);
        try { await ExecuteSqlAsync("ALTER TABLE staffs ADD COLUMN trainid INTEGER DEFAULT 0;"); } catch { }

        var sqlLower = $@"INSERT INTO staffs (id, trainid, hotel_id, first_name, last_name, full_name, mobile, email, address, role, department, joining_date, salary, status, created_at)
VALUES ('{sId}', (SELECT COALESCE(MAX(trainid), 0) + 1 FROM staffs WHERE id != '{sId}'), '{hId}', '{safeFirst}', '{safeLast}', '{safeFull}', '{safeMobile}', '{safeEmail}', '{safeAddr}', '{safeRole}', '{safeDept}', '{nowIso}', {salary}, '{safeStatus}', '{nowIso}')
ON CONFLICT(id) DO UPDATE SET first_name = '{safeFirst}', last_name = '{safeLast}', full_name = '{safeFull}', mobile = '{safeMobile}', email = '{safeEmail}', role = '{safeRole}', department = '{safeDept}', salary = {salary}, status = '{safeStatus}';";

        await ExecuteSqlAsync(sqlLower);
    }

    public async Task DeleteStaffAsync(string id)
    {
        var cleanId = (id ?? "").Trim();
        var cleanStaffStr = CleanStaffId(cleanId);
        var detGuidStr = GetDeterministicGuid(cleanId).ToString();

        await ExecuteSqlAsync($"DELETE FROM staff_attendances WHERE staff_id = '{cleanId}' OR staff_id = '{cleanStaffStr}' OR staff_id = '{detGuidStr}';");
        await ExecuteSqlAsync($"DELETE FROM staffs WHERE id = '{cleanId}' OR id = '{cleanStaffStr}' OR id = '{detGuidStr}' OR id LIKE '%{cleanId}%';");
        await ExecuteSqlAsync($"DELETE FROM Staffs WHERE Id = '{cleanId}' OR Id = '{cleanStaffStr}' OR Id = '{detGuidStr}' OR Id LIKE '%{cleanId}%';");
    }

    public async Task SyncExpenseAsync(string id, string category, decimal amount, string description, string expenseDate, string paymentMethod, string? referenceNumber = null, string? createdBy = null, string? hotelId = null)
    {
        var hId = CleanHotelId(hotelId);
        var safeCat = (category ?? "").Replace("'", "''");
        var safeDesc = (description ?? "").Replace("'", "''");
        var safeMethod = (paymentMethod ?? "Cash").Replace("'", "''");
        var safeRef = (referenceNumber ?? "").Replace("'", "''");
        var safeUser = (createdBy ?? "").Replace("'", "''");

        var createTableLower = @"CREATE TABLE IF NOT EXISTS expenses (
            id TEXT PRIMARY KEY,
            trainid INTEGER DEFAULT 0,
            hotel_id TEXT,
            hotel_code TEXT,
            category TEXT,
            amount NUMERIC,
            description TEXT,
            expense_date TEXT,
            payment_method TEXT,
            reference_number TEXT,
            created_by TEXT,
            receipt_url TEXT,
            created_at TEXT,
            updated_at TEXT
        );";
        await ExecuteSqlAsync(createTableLower);
        try { await ExecuteSqlAsync("ALTER TABLE expenses ADD COLUMN trainid INTEGER DEFAULT 0;"); } catch { }
        try { await ExecuteSqlAsync("ALTER TABLE expenses ADD COLUMN reference_number TEXT;"); } catch { }
        try { await ExecuteSqlAsync("ALTER TABLE expenses ADD COLUMN created_by TEXT;"); } catch { }
        try { await ExecuteSqlAsync("ALTER TABLE expenses ADD COLUMN receipt_url TEXT;"); } catch { }

        var sqlLower = $@"INSERT INTO expenses (id, trainid, hotel_id, category, amount, description, expense_date, payment_method, reference_number, created_by)
VALUES ('{id}', (SELECT COALESCE(MAX(trainid), 0) + 1 FROM expenses WHERE id != '{id}'), '{hId}', '{safeCat}', {amount}, '{safeDesc}', '{expenseDate}', '{safeMethod}', '{safeRef}', '{safeUser}')
ON CONFLICT(id) DO UPDATE SET category = '{safeCat}', amount = {amount}, description = '{safeDesc}', expense_date = '{expenseDate}', payment_method = '{safeMethod}', reference_number = '{safeRef}', created_by = '{safeUser}';";

        await ExecuteSqlAsync(sqlLower);

        // 2. PascalCase table 'Expenses'
        var createTablePascal = @"CREATE TABLE IF NOT EXISTS Expenses (
            Id TEXT PRIMARY KEY,
            trainid INTEGER DEFAULT 0,
            HotelId TEXT,
            HotelCode TEXT,
            Category TEXT,
            Amount NUMERIC,
            Description TEXT,
            ExpenseDate TEXT,
            PaymentMethod TEXT,
            ReferenceNumber TEXT,
            CreatedBy TEXT,
            ReceiptUrl TEXT,
            CreatedAt TEXT,
            UpdatedAt TEXT
        );";
        await ExecuteSqlAsync(createTablePascal);
        try { await ExecuteSqlAsync("ALTER TABLE Expenses ADD COLUMN trainid INTEGER DEFAULT 0;"); } catch { }

        var sqlPascal = $@"INSERT INTO Expenses (Id, trainid, HotelId, Category, Amount, Description, ExpenseDate, PaymentMethod, ReferenceNumber, CreatedBy)
VALUES ('{id}', (SELECT COALESCE(MAX(trainid), 0) + 1 FROM Expenses WHERE Id != '{id}'), '{hId}', '{safeCat}', {amount}, '{safeDesc}', '{expenseDate}', '{safeMethod}', '{safeRef}', '{safeUser}')
ON CONFLICT(Id) DO UPDATE SET Category = '{safeCat}', Amount = {amount}, Description = '{safeDesc}', ExpenseDate = '{expenseDate}', PaymentMethod = '{safeMethod}', ReferenceNumber = '{safeRef}', CreatedBy = '{safeUser}';";

        await ExecuteSqlAsync(sqlPascal);
    }

    public async Task SyncAttendanceAsync(string id, string hotelId, string staffId, string attendanceDate, string? checkInTime = null, string? checkOutTime = null, string status = "Present", string? notes = null, string? staffName = null, string? staffRole = null)
    {
        var hId = CleanHotelId(hotelId);
        var sId = (staffId ?? "").Trim();
        var attId = (id ?? "").Trim();
        var safeIn = (checkInTime ?? "09:00").Replace("'", "''");
        var safeOut = (checkOutTime ?? "18:00").Replace("'", "''");
        var safeStatus = (status ?? "Present").Replace("'", "''");
        var notesEsc = (notes ?? "").Replace("'", "''");
        var sName = (staffName ?? "").Replace("'", "''");
        var sRole = (staffRole ?? "").Replace("'", "''");

        var createTableSql = @"CREATE TABLE IF NOT EXISTS staff_attendances (
            trainid INTEGER DEFAULT 0,
            id TEXT PRIMARY KEY,
            hotel_id TEXT,
            staff_id TEXT,
            staff_name TEXT,
            role TEXT,
            attendance_date TEXT,
            check_in_time TEXT,
            check_out_time TEXT,
            status TEXT,
            notes TEXT
        );";
        await ExecuteSqlAsync(createTableSql);
        try { await ExecuteSqlAsync("ALTER TABLE staff_attendances ADD COLUMN trainid INTEGER DEFAULT 0;"); } catch { }
        try { await ExecuteSqlAsync("ALTER TABLE staff_attendances ADD COLUMN staff_name TEXT;"); } catch { }
        try { await ExecuteSqlAsync("ALTER TABLE staff_attendances ADD COLUMN role TEXT;"); } catch { }

        var sql = $@"INSERT INTO staff_attendances (trainid, id, hotel_id, staff_id, staff_name, role, attendance_date, check_in_time, check_out_time, status, notes)
VALUES ((SELECT COALESCE(MAX(trainid), 0) + 1 FROM staff_attendances WHERE id != '{attId}'), '{attId}', '{hId}', '{sId}', '{sName}', '{sRole}', '{attendanceDate}', '{safeIn}', '{safeOut}', '{safeStatus}', '{notesEsc}')
ON CONFLICT(id) DO UPDATE SET trainid = (SELECT COALESCE(MAX(trainid), 0) + 1 FROM staff_attendances WHERE id != '{attId}'), staff_name = CASE WHEN '{sName}' != '' THEN '{sName}' ELSE staff_name END, role = CASE WHEN '{sRole}' != '' THEN '{sRole}' ELSE role END, check_in_time = '{safeIn}', check_out_time = '{safeOut}', status = '{safeStatus}', notes = '{notesEsc}';";

        await ExecuteSqlAsync(sql);
    }

    public async Task PullFromTursoToLocalAsync(HotelSaaS.Infrastructure.Persistence.ApplicationDbContext db)
    {
        try
        {
            // 1. Pull Hotels from Turso Cloud
            var hotelRequestObj = new
            {
                requests = new[]
                {
                    new
                    {
                        type = "execute",
                        stmt = new { sql = "SELECT id, name, status, email, phone FROM hotels;" }
                    }
                }
            };

            var hotelJson = JsonSerializer.Serialize(hotelRequestObj);
            var hotelReq = new HttpRequestMessage(HttpMethod.Post, _tursoUrl);
            hotelReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _authToken);
            hotelReq.Content = new StringContent(hotelJson, Encoding.UTF8, "application/json");

            var hotelResp = await _httpClient.SendAsync(hotelReq);
            if (hotelResp.IsSuccessStatusCode)
            {
                var body = await hotelResp.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(body);
                var root = doc.RootElement;

                if (root.TryGetProperty("results", out var results) && results.GetArrayLength() > 0 &&
                    results[0].TryGetProperty("response", out var respObj) &&
                    respObj.TryGetProperty("result", out var resVal) &&
                    resVal.TryGetProperty("rows", out var rowsArr))
                {
                    foreach (var row in rowsArr.EnumerateArray())
                    {
                        var cols = row.EnumerateArray().ToList();
                        if (cols.Count >= 3)
                        {
                            var idStr = cols[0].GetProperty("value").ValueKind == JsonValueKind.String ? cols[0].GetProperty("value").GetString() ?? "" : "";
                            var nameStr = cols[1].GetProperty("value").ValueKind == JsonValueKind.String ? cols[1].GetProperty("value").GetString() ?? "" : "";
                            var statusStr = cols[2].GetProperty("value").ValueKind == JsonValueKind.String ? cols[2].GetProperty("value").GetString() ?? "0" : "0";
                            var emailStr = cols.Count > 3 && cols[3].GetProperty("value").ValueKind == JsonValueKind.String ? (cols[3].GetProperty("value").GetString() ?? "") : "";
                            var phoneStr = cols.Count > 4 && cols[4].GetProperty("value").ValueKind == JsonValueKind.String ? (cols[4].GetProperty("value").GetString() ?? "") : "";

                            var hotelGuid = GetDeterministicGuid(idStr);
                            var localHotel = await db.Hotels.IgnoreQueryFilters().FirstOrDefaultAsync(h => h.Id == hotelGuid || h.Slug.ToLower() == nameStr.ToLower().Replace(" ", "-"));

                            if (localHotel != null)
                            {
                                localHotel.Status = statusStr;
                                if (!string.IsNullOrWhiteSpace(nameStr)) localHotel.Name = nameStr;
                            }
                        }
                    }
                }
            }

            // 2. Pull Profiles from Turso Cloud
            var profileRequestObj = new
            {
                requests = new[]
                {
                    new
                    {
                        type = "execute",
                        stmt = new { sql = "SELECT Id, Email, Status, FullName, Role, HotelId, IsSuperAdmin, PasswordHash, StaffPasswordHash FROM Profiles;" }
                    }
                }
            };

            var profileJson = JsonSerializer.Serialize(profileRequestObj);
            var profileReq = new HttpRequestMessage(HttpMethod.Post, _tursoUrl);
            profileReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _authToken);
            profileReq.Content = new StringContent(profileJson, Encoding.UTF8, "application/json");

            var profileResp = await _httpClient.SendAsync(profileReq);
            if (profileResp.IsSuccessStatusCode)
            {
                var body = await profileResp.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(body);
                var root = doc.RootElement;

                if (root.TryGetProperty("results", out var results) && results.GetArrayLength() > 0 &&
                    results[0].TryGetProperty("response", out var respObj) &&
                    respObj.TryGetProperty("result", out var resVal) &&
                    resVal.TryGetProperty("rows", out var rowsArr))
                {
                    foreach (var row in rowsArr.EnumerateArray())
                    {
                        var cols = row.EnumerateArray().ToList();
                        if (cols.Count >= 3)
                        {
                            var emailStr = cols[1].TryGetProperty("value", out var eVal) && eVal.ValueKind == JsonValueKind.String ? (eVal.GetString() ?? "").Trim().ToLower() : "";
                            bool statusBool = cols.Count > 2 && ParseBoolValue(cols[2]);
                            var fullNameStr = cols.Count > 3 && cols[3].TryGetProperty("value", out var fnVal) && fnVal.ValueKind == JsonValueKind.String ? fnVal.GetString() : null;
                            var roleStr = cols.Count > 4 && cols[4].TryGetProperty("value", out var rVal) && rVal.ValueKind == JsonValueKind.String ? rVal.GetString() : null;
                            bool isSuperAdmin = cols.Count > 6 && ParseBoolValue(cols[6]);
                            var pwdHashStr = cols.Count > 7 && cols[7].TryGetProperty("value", out var pVal) && pVal.ValueKind == JsonValueKind.String ? pVal.GetString() : null;
                            var staffPwdHashStr = cols.Count > 8 && cols[8].TryGetProperty("value", out var spVal) && spVal.ValueKind == JsonValueKind.String ? spVal.GetString() : null;

                            if (!string.IsNullOrWhiteSpace(emailStr))
                            {
                                var localProfile = await db.Profiles.IgnoreQueryFilters().FirstOrDefaultAsync(p => p.Email.ToLower() == emailStr);
                                if (localProfile != null)
                                {
                                    localProfile.Status = statusBool;
                                    localProfile.IsSuperAdmin = isSuperAdmin;
                                    if (!string.IsNullOrWhiteSpace(fullNameStr)) localProfile.FullName = fullNameStr;
                                    if (!string.IsNullOrWhiteSpace(pwdHashStr)) localProfile.PasswordHash = pwdHashStr;
                                    if (!string.IsNullOrWhiteSpace(staffPwdHashStr)) localProfile.StaffPasswordHash = staffPwdHashStr;
                                    if (!string.IsNullOrWhiteSpace(roleStr) && Enum.TryParse<HotelSaaS.Domain.Enums.UserRole>(roleStr, true, out var parsedRole))
                                        localProfile.Role = parsedRole;
                                }
                            }
                        }
                    }
                }
            }

            await db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to pull live data from Turso Cloud to local DB");
        }
    }
}
