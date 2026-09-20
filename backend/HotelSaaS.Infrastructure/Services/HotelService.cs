using HotelSaaS.Application.Common.Interfaces;
using HotelSaaS.Application.Common.Models;
using HotelSaaS.Application.DTOs;
using HotelSaaS.Application.Interfaces;
using HotelSaaS.Domain.Entities;
using HotelSaaS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HotelSaaS.Infrastructure.Services;

public class HotelService : IHotelService
{
    private readonly ApplicationDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly ITursoSyncService _tursoSync;

    public HotelService(ApplicationDbContext db, ITenantContext tenantContext, ITursoSyncService tursoSync)
    {
        _db = db;
        _tenantContext = tenantContext;
        _tursoSync = tursoSync;
    }

    public async Task<ApiResponse<HotelDto>> GetCurrentHotelAsync()
    {
        var targetHotelId = _tenantContext.HotelId;
        if (!targetHotelId.HasValue || targetHotelId.Value == Guid.Empty)
        {
            var firstHotel = await _db.Hotels.FirstOrDefaultAsync();
            if (firstHotel != null) targetHotelId = firstHotel.Id;
        }

        if (!targetHotelId.HasValue || targetHotelId.Value == Guid.Empty)
            return ApiResponse<HotelDto>.Fail("No tenant context associated with current request");

        try
        {
            var tursoHotel = await _tursoSync.FetchHotelByIdFromTursoAsync(targetHotelId.Value);
            if (tursoHotel != null)
            {
                var local = await _db.Hotels.FirstOrDefaultAsync(h => h.Id == targetHotelId.Value);
                if (local != null)
                {
                    local.Name = tursoHotel.Name;
                    if (!string.IsNullOrEmpty(tursoHotel.Phone)) local.Phone = tursoHotel.Phone;
                    if (!string.IsNullOrEmpty(tursoHotel.Email)) local.Email = tursoHotel.Email;
                    if (!string.IsNullOrEmpty(tursoHotel.Address)) local.Address = tursoHotel.Address;
                    if (!string.IsNullOrEmpty(tursoHotel.City)) local.City = tursoHotel.City;
                    if (!string.IsNullOrEmpty(tursoHotel.State)) local.State = tursoHotel.State;
                    if (!string.IsNullOrEmpty(tursoHotel.GstNumber)) local.GstNumber = tursoHotel.GstNumber;
                    if (!string.IsNullOrEmpty(tursoHotel.TaxRate)) local.TaxRate = tursoHotel.TaxRate;
                    if (!string.IsNullOrEmpty(tursoHotel.BankName)) local.BankName = tursoHotel.BankName;
                    if (!string.IsNullOrEmpty(tursoHotel.AccountNo)) local.AccountNo = tursoHotel.AccountNo;
                    if (!string.IsNullOrEmpty(tursoHotel.IfscCode)) local.IfscCode = tursoHotel.IfscCode;
                    if (!string.IsNullOrEmpty(tursoHotel.UpiId)) local.UpiId = tursoHotel.UpiId;
                    if (!string.IsNullOrEmpty(tursoHotel.WifiName)) local.WifiName = tursoHotel.WifiName;
                    if (!string.IsNullOrEmpty(tursoHotel.WifiPassword)) local.WifiPassword = tursoHotel.WifiPassword;
                    if (!string.IsNullOrEmpty(tursoHotel.ReviewUrl)) local.ReviewUrl = tursoHotel.ReviewUrl;
                    await _db.SaveChangesAsync();
                    return ApiResponse<HotelDto>.Ok(MapToDto(local));
                }
            }
        }
        catch { }

        var hotel = await _db.Hotels.FirstOrDefaultAsync(h => h.Id == targetHotelId.Value);
        if (hotel == null)
            return ApiResponse<HotelDto>.Fail("Hotel not found");

        return ApiResponse<HotelDto>.Ok(MapToDto(hotel));
    }

    public async Task<ApiResponse<HotelDto>> GetHotelBySlugAsync(string slug)
    {
        var hotel = await _db.Hotels.FirstOrDefaultAsync(h => h.Slug.ToLower() == slug.ToLower());
        if (hotel == null)
            return ApiResponse<HotelDto>.Fail("Hotel not found");

        return ApiResponse<HotelDto>.Ok(MapToDto(hotel));
    }

    public async Task<ApiResponse<HotelDto>> UpdateHotelAsync(UpdateHotelDto request)
    {
        var targetHotelId = _tenantContext.HotelId;
        if (!targetHotelId.HasValue || targetHotelId.Value == Guid.Empty)
        {
            var firstHotel = await _db.Hotels.FirstOrDefaultAsync();
            if (firstHotel != null) targetHotelId = firstHotel.Id;
        }

        if (!targetHotelId.HasValue || targetHotelId.Value == Guid.Empty)
            return ApiResponse<HotelDto>.Fail("No tenant context");

        var hotel = await _db.Hotels.FirstOrDefaultAsync(h => h.Id == targetHotelId.Value);
        if (hotel == null)
            return ApiResponse<HotelDto>.Fail("Hotel not found");

        var phoneReq = request.Phone?.Trim();
        var emailReq = request.Email?.Trim();

        var existingOtherHotel = await _db.Hotels.IgnoreQueryFilters()
            .FirstOrDefaultAsync(h => h.Id != hotel.Id && 
                ((!string.IsNullOrEmpty(phoneReq) && h.Phone == phoneReq) || 
                 (!string.IsNullOrEmpty(emailReq) && h.Email.ToLower() == emailReq.ToLower())));

        if (existingOtherHotel != null)
        {
            if (!string.IsNullOrEmpty(phoneReq) && existingOtherHotel.Phone == phoneReq)
            {
                return ApiResponse<HotelDto>.Fail("Phone number is already registered with another hotel! Please use a different phone number.");
            }
            if (!string.IsNullOrEmpty(emailReq) && existingOtherHotel.Email.Equals(emailReq, StringComparison.OrdinalIgnoreCase))
            {
                return ApiResponse<HotelDto>.Fail("Email ID is already registered with another hotel! Please use a different email address.");
            }
        }

        hotel.Name = request.Name;
        hotel.LogoUrl = request.LogoUrl;
        hotel.CoverImageUrl = request.CoverImageUrl;
        hotel.Description = request.Description;
        hotel.Phone = request.Phone;
        hotel.Email = request.Email;
        hotel.Website = request.Website;
        hotel.Address = request.Address;
        hotel.City = request.City;
        hotel.State = request.State;
        hotel.Country = request.Country;
        hotel.Pincode = request.Pincode;
        hotel.CheckInTime = request.CheckInTime;
        hotel.CheckOutTime = request.CheckOutTime;
        hotel.Currency = request.Currency;
        hotel.Timezone = request.Timezone;
        hotel.GstNumber = request.GstNumber;
        hotel.TaxRate = request.TaxRate;
        hotel.BankName = request.BankName;
        hotel.AccountNo = request.AccountNo;
        hotel.IfscCode = request.IfscCode;
        hotel.UpiId = request.UpiId;
        if (!string.IsNullOrEmpty(request.WifiName)) hotel.WifiName = request.WifiName;
        if (!string.IsNullOrEmpty(request.WifiPassword)) hotel.WifiPassword = request.WifiPassword;
        if (!string.IsNullOrEmpty(request.ReviewUrl)) hotel.ReviewUrl = request.ReviewUrl;

        await _db.SaveChangesAsync();

        try
        {
            await _tursoSync.SyncHotelAsync(hotel.Id.ToString(), hotel.Name, hotel.Slug, hotel.Phone, hotel.Email, hotel.Address, hotel.City, hotel.State, hotel.Country, hotel.Pincode, hotel.Status, hotel.HotelCode, hotel.GstNumber, hotel.TaxRate, hotel.BankName, hotel.AccountNo, hotel.IfscCode, hotel.UpiId, hotel.WifiName, hotel.WifiPassword, hotel.ReviewUrl);
        }
        catch { }

        return ApiResponse<HotelDto>.Ok(MapToDto(hotel), "Hotel updated successfully");
    }

    public async Task<ApiResponse<List<HotelDto>>> GetAllHotelsAsync()
    {
        var hotels = await _db.Hotels.IgnoreQueryFilters().ToListAsync();
        return ApiResponse<List<HotelDto>>.Ok(hotels.Select(MapToDto).ToList());
    }

    public async Task<ApiResponse<List<HotelDto>>> GetPendingHotelsAsync()
    {
        var hotels = await _db.Hotels.IgnoreQueryFilters()
            .Where(h => h.Status == "0" || h.Status == "PendingApproval" || h.Status == "Pending" || h.Status.ToLower().Contains("pending"))
            .ToListAsync();
        return ApiResponse<List<HotelDto>>.Ok(hotels.Select(MapToDto).ToList());
    }

    public async Task<ApiResponse<bool>> ApproveHotelAsync(Guid hotelId)
    {
        var hotel = await _db.Hotels.IgnoreQueryFilters().FirstOrDefaultAsync(h => h.Id == hotelId);
        if (hotel == null)
            return ApiResponse<bool>.Fail("Hotel not found");

        hotel.Status = "1";

        var profiles = await _db.Profiles.IgnoreQueryFilters().Where(p => p.HotelId == hotelId).ToListAsync();
        foreach (var p in profiles)
        {
            p.Status = true;
        }

        await _db.SaveChangesAsync();

        try
        {
            await _tursoSync.SyncHotelAsync(hotel.Id.ToString(), hotel.Name, hotel.Slug, hotel.Phone, hotel.Email, hotel.Address, hotel.City, hotel.State, hotel.Country, hotel.Pincode, "1", hotel.HotelCode, hotel.GstNumber, hotel.TaxRate, hotel.BankName, hotel.AccountNo, hotel.IfscCode, hotel.UpiId);
            foreach (var p in profiles)
            {
                await _tursoSync.SyncProfileAsync(p.Id.ToString(), p.FullName, p.Email, p.Phone, p.PasswordHash, p.IsSuperAdmin, p.Status, p.HotelId, p.Role.ToString(), p.StaffPasswordHash);
            }
        }
        catch { }

        return ApiResponse<bool>.Ok(true, $"Hotel '{hotel.Name}' approved successfully!");
    }

    public async Task<ApiResponse<bool>> RejectHotelAsync(Guid hotelId)
    {
        var hotel = await _db.Hotels.IgnoreQueryFilters().FirstOrDefaultAsync(h => h.Id == hotelId);
        if (hotel == null)
            return ApiResponse<bool>.Fail("Hotel not found");

        hotel.Status = "Rejected";

        var profiles = await _db.Profiles.IgnoreQueryFilters().Where(p => p.HotelId == hotelId).ToListAsync();
        foreach (var p in profiles)
        {
            p.Status = false;
        }

        await _db.SaveChangesAsync();

        try
        {
            await _tursoSync.SyncHotelAsync(hotel.Id.ToString(), hotel.Name, hotel.Slug, hotel.Phone, hotel.Email, hotel.Address, hotel.City, hotel.State, hotel.Country, hotel.Pincode, "Rejected", hotel.HotelCode, hotel.GstNumber, hotel.TaxRate, hotel.BankName, hotel.AccountNo, hotel.IfscCode, hotel.UpiId);
            foreach (var p in profiles)
            {
                await _tursoSync.SyncProfileAsync(p.Id.ToString(), p.FullName, p.Email, p.Phone, p.PasswordHash, p.IsSuperAdmin, p.Status, p.HotelId, p.Role.ToString(), p.StaffPasswordHash);
            }
        }
        catch { }

        return ApiResponse<bool>.Ok(true, $"Hotel '{hotel.Name}' registration rejected.");
    }

    public async Task<ApiResponse<bool>> SuspendHotelAsync(Guid hotelId)
    {
        var hotel = await _db.Hotels.IgnoreQueryFilters().FirstOrDefaultAsync(h => h.Id == hotelId);
        if (hotel == null)
            return ApiResponse<bool>.Fail("Hotel not found");

        hotel.Status = "Suspended";

        var profiles = await _db.Profiles.IgnoreQueryFilters().Where(p => p.HotelId == hotelId).ToListAsync();
        foreach (var p in profiles)
        {
            p.Status = false;
        }

        await _db.SaveChangesAsync();

        try
        {
            await _tursoSync.SyncHotelAsync(hotel.Id.ToString(), hotel.Name, hotel.Slug, hotel.Phone, hotel.Email, hotel.Address, hotel.City, hotel.State, hotel.Country, hotel.Pincode, "Suspended", hotel.HotelCode, hotel.GstNumber, hotel.TaxRate, hotel.BankName, hotel.AccountNo, hotel.IfscCode, hotel.UpiId);
            foreach (var p in profiles)
            {
                await _tursoSync.SyncProfileAsync(p.Id.ToString(), p.FullName, p.Email, p.Phone, p.PasswordHash, p.IsSuperAdmin, p.Status, p.HotelId, p.Role.ToString(), p.StaffPasswordHash);
            }
        }
        catch { }

        return ApiResponse<bool>.Ok(true, $"Hotel '{hotel.Name}' suspended successfully.");
    }

    public async Task<ApiResponse<bool>> DeleteHotelAsync(Guid hotelId)
    {
        var hotel = await _db.Hotels.IgnoreQueryFilters().FirstOrDefaultAsync(h => h.Id == hotelId);
        if (hotel == null)
            return ApiResponse<bool>.Fail("Hotel not found");

        var profiles = await _db.Profiles.IgnoreQueryFilters().Where(p => p.HotelId == hotelId).ToListAsync();
        _db.Profiles.RemoveRange(profiles);

        var rooms = await _db.Rooms.IgnoreQueryFilters().Where(r => r.HotelId == hotelId).ToListAsync();
        _db.Rooms.RemoveRange(rooms);

        var roomTypes = await _db.RoomTypes.IgnoreQueryFilters().Where(rt => rt.HotelId == hotelId).ToListAsync();
        _db.RoomTypes.RemoveRange(roomTypes);

        _db.Hotels.Remove(hotel);
        await _db.SaveChangesAsync();

        try
        {
            var cleanHId = hotelId.ToString().StartsWith("00000000-0000-0000-0000-")
                ? $"hotel-{int.Parse(hotelId.ToString().Substring("00000000-0000-0000-0000-".Length))}"
                : hotelId.ToString();

            await _tursoSync.ExecuteSqlAsync($"DELETE FROM rooms WHERE hotel_id = '{hotelId}' OR hotel_id = '{cleanHId}';");
            await _tursoSync.ExecuteSqlAsync($"DELETE FROM room_types WHERE hotel_id = '{hotelId}' OR hotel_id = '{cleanHId}';");
            await _tursoSync.ExecuteSqlAsync($"DELETE FROM Profiles WHERE HotelId = '{hotelId}' OR HotelId = '{cleanHId}';");
            await _tursoSync.ExecuteSqlAsync($"DELETE FROM hotels WHERE id = '{hotelId}' OR id = '{cleanHId}';");
            await _tursoSync.ExecuteSqlAsync($"DELETE FROM Hotels WHERE Id = '{hotelId}' OR Id = '{cleanHId}';");
        }
        catch { }

        return ApiResponse<bool>.Ok(true, $"Hotel '{hotel.Name}' deleted from Database.");
    }

    private static HotelDto MapToDto(Hotel h) => new(
        h.Id, h.Name, h.Slug, h.LogoUrl, h.CoverImageUrl, h.Description,
        h.Phone, h.Email, h.Website, h.Address, h.City, h.State, h.Country,
        h.Pincode, h.CheckInTime, h.CheckOutTime, h.Currency, h.Timezone,
        h.GstNumber, h.TaxRate, h.BankName, h.AccountNo, h.IfscCode, h.UpiId, h.Status,
        h.WifiName, h.WifiPassword, h.ReviewUrl
    );
}
