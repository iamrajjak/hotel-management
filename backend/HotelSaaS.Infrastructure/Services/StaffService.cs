using HotelSaaS.Application.Common.Interfaces;
using HotelSaaS.Application.Common.Models;
using HotelSaaS.Application.DTOs;
using HotelSaaS.Application.Interfaces;
using HotelSaaS.Domain.Entities;
using HotelSaaS.Domain.Enums;
using HotelSaaS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HotelSaaS.Infrastructure.Services;

public class StaffService : IStaffService
{
    private readonly ApplicationDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly ITursoSyncService _tursoSync;

    public StaffService(ApplicationDbContext db, ITenantContext tenantContext, ITursoSyncService tursoSync)
    {
        _db = db;
        _tenantContext = tenantContext;
        _tursoSync = tursoSync;
    }

    private Guid GetTenantHotelId()
    {
        if (!_tenantContext.HotelId.HasValue || _tenantContext.HotelId.Value == Guid.Empty)
        {
            throw new UnauthorizedAccessException("Tenant context is required for staff operations.");
        }
        return _tenantContext.HotelId.Value;
    }

    // --- STAFF MEMBERS (OWNER VIEW - INCLUDES SALARY) ---
    public async Task<ApiResponse<List<StaffDto>>> GetStaffMembersAsync()
    {
        var isSuperAdmin = _tenantContext?.IsSuperAdmin ?? false;
        var tenantHotelId = GetTenantHotelId();
        var tenantHotelIdStr = tenantHotelId.ToString();
        string? filterHotelId = !isSuperAdmin ? tenantHotelIdStr : null;

        try
        {
            var tursoStaff = await _tursoSync.FetchStaffFromTursoAsync(filterHotelId);
            if (tursoStaff != null)
            {
                if (!isSuperAdmin)
                {
                    tursoStaff = tursoStaff
                        .Where(s => s.HotelId == tenantHotelId || s.HotelId.ToString().Equals(tenantHotelIdStr, StringComparison.OrdinalIgnoreCase))
                        .ToList();
                }
                return ApiResponse<List<StaffDto>>.Ok(tursoStaff);
            }
        }
        catch { }

        var query = _db.Staffs.AsQueryable();
        if (!isSuperAdmin)
        {
            query = query.Where(s => s.HotelId == tenantHotelId);
        }

        var staffList = await query.OrderBy(s => s.FirstName).ToListAsync();

        var dtos = staffList.Select(s => new StaffDto(
            s.Id, s.HotelId, s.FirstName, s.LastName, s.FullName, s.Mobile, s.Email, s.Address, s.Role, s.Department, s.JoiningDate, s.Salary, s.Status, s.ProfileImage, s.CreatedAt
        )).ToList();

        return ApiResponse<List<StaffDto>>.Ok(dtos);
    }

    // --- STAFF MEMBERS (SAFE VIEW - EXCLUDES SALARY FOR STAFF MANAGER) ---
    public async Task<ApiResponse<List<StaffSafeDto>>> GetStaffMembersSafeAsync()
    {
        var result = await GetStaffMembersAsync();
        if (!result.Success || result.Data == null)
            return ApiResponse<List<StaffSafeDto>>.Fail(result.Message ?? "Failed to fetch staff members");

        var dtos = result.Data.Select(s => new StaffSafeDto(
            s.Id, s.HotelId, s.FirstName, s.LastName, s.FullName, s.Mobile, s.Email, s.Address, s.Role, s.Department, s.JoiningDate, s.Status, s.ProfileImage, s.CreatedAt
        )).ToList();

        return ApiResponse<List<StaffSafeDto>>.Ok(dtos);
    }

    public async Task<ApiResponse<StaffDto>> GetStaffByIdAsync(Guid id)
    {
        var s = await _db.Staffs.FirstOrDefaultAsync(x => x.Id == id);
        if (s == null) return ApiResponse<StaffDto>.Fail("Staff member not found");

        return ApiResponse<StaffDto>.Ok(new StaffDto(
            s.Id, s.HotelId, s.FirstName, s.LastName, s.FullName, s.Mobile, s.Email, s.Address, s.Role, s.Department, s.JoiningDate, s.Salary, s.Status, s.ProfileImage, s.CreatedAt
        ));
    }

    public async Task<ApiResponse<StaffDto>> CreateStaffAsync(CreateStaffDto request)
    {
        var hotelId = GetTenantHotelId();

        // Ensure Hotel entity exists in local DB context to satisfy FK constraints
        var localHotel = await _db.Hotels.FirstOrDefaultAsync(h => h.Id == hotelId);
        if (localHotel == null)
        {
            _db.Hotels.Add(new Hotel
            {
                Id = hotelId,
                Name = "Grand Palace Hotel",
                Slug = "grand-palace",
                Phone = "",
                Email = "",
                Status = "Active"
            });
            try { await _db.SaveChangesAsync(); } catch { }
        }

        // 1. First Name Validation
        if (string.IsNullOrWhiteSpace(request.FirstName))
            return ApiResponse<StaffDto>.Fail("First name is required.");

        // 2. Mobile Validation (Exactly 10 numeric digits & Unique)
        var mobile = (request.Mobile ?? "").Trim();
        if (string.IsNullOrWhiteSpace(mobile))
            return ApiResponse<StaffDto>.Fail("Mobile number is required.");

        if (!System.Text.RegularExpressions.Regex.IsMatch(mobile, @"^\d{10}$"))
            return ApiResponse<StaffDto>.Fail("Mobile number must be exactly 10 numeric digits.");

        if (await _db.Staffs.AnyAsync(s => s.Mobile == mobile))
            return ApiResponse<StaffDto>.Fail($"Mobile number '{mobile}' is already registered with another staff member.");

        // 3. Email Validation (Format & Unique)
        var email = (request.Email ?? "").Trim().ToLower();
        if (string.IsNullOrWhiteSpace(email))
            return ApiResponse<StaffDto>.Fail("Email address is required.");

        if (!System.Text.RegularExpressions.Regex.IsMatch(email, @"^[^@\s]+@[^@\s]+\.[^@\s]+$"))
            return ApiResponse<StaffDto>.Fail("Please enter a valid email address.");

        if (await _db.Staffs.AnyAsync(s => s.Email.ToLower() == email))
            return ApiResponse<StaffDto>.Fail($"Email address '{email}' is already registered with another staff member.");

        // 4. Salary Validation
        if (request.Salary < 0)
            return ApiResponse<StaffDto>.Fail("Salary cannot be negative.");

        var fullName = $"{request.FirstName.Trim()} {request.LastName.Trim()}".Trim();

        var existingCount = await _db.Staffs.CountAsync();
        var nextStaffNum = existingCount + 1;
        var customStaffIdStr = $"staff-{nextStaffNum}";

        using var md5 = System.Security.Cryptography.MD5.Create();
        var hash = md5.ComputeHash(System.Text.Encoding.UTF8.GetBytes(customStaffIdStr));
        var customStaffGuid = new Guid(hash);

        var staff = new Staff
        {
            Id = customStaffGuid,
            HotelId = hotelId,
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            FullName = fullName,
            Mobile = mobile,
            Email = email,
            Address = request.Address,
            Role = string.IsNullOrWhiteSpace(request.Role) ? "Staff" : request.Role.Trim(),
            Department = string.IsNullOrWhiteSpace(request.Department) ? "General" : request.Department.Trim(),
            JoiningDate = request.JoiningDate ?? DateTime.UtcNow,
            Salary = request.Salary,
            Status = string.IsNullOrWhiteSpace(request.Status) ? "Active" : request.Status,
            ProfileImage = request.ProfileImage
        };

        _db.Staffs.Add(staff);
        await _db.SaveChangesAsync();

        try
        {
            await _tursoSync.SyncStaffAsync(
                customStaffIdStr, staff.FirstName, staff.LastName, staff.FullName,
                staff.Mobile, staff.Email, staff.Address, staff.Role, staff.Department,
                staff.Salary, staff.Status, staff.HotelId.ToString()
            );
        }
        catch { }

        return ApiResponse<StaffDto>.Ok(new StaffDto(
            staff.Id, staff.HotelId, staff.FirstName, staff.LastName, staff.FullName, staff.Mobile, staff.Email, staff.Address, staff.Role, staff.Department, staff.JoiningDate, staff.Salary, staff.Status, staff.ProfileImage, staff.CreatedAt
        ), "Staff member added successfully");
    }

    public async Task<ApiResponse<StaffDto>> UpdateStaffAsync(Guid id, UpdateStaffDto request)
    {
        var s = await _db.Staffs.FirstOrDefaultAsync(x => x.Id == id);
        if (s == null) return ApiResponse<StaffDto>.Fail("Staff member not found");

        if (string.IsNullOrWhiteSpace(request.FirstName))
            return ApiResponse<StaffDto>.Fail("First name is required.");

        var mobile = (request.Mobile ?? "").Trim();
        if (string.IsNullOrWhiteSpace(mobile))
            return ApiResponse<StaffDto>.Fail("Mobile number is required.");

        if (!System.Text.RegularExpressions.Regex.IsMatch(mobile, @"^\d{10}$"))
            return ApiResponse<StaffDto>.Fail("Mobile number must be exactly 10 numeric digits.");

        if (await _db.Staffs.AnyAsync(x => x.Id != id && x.Mobile == mobile))
            return ApiResponse<StaffDto>.Fail($"Mobile number '{mobile}' is already registered with another staff member.");

        var email = (request.Email ?? "").Trim().ToLower();
        if (string.IsNullOrWhiteSpace(email))
            return ApiResponse<StaffDto>.Fail("Email address is required.");

        if (!System.Text.RegularExpressions.Regex.IsMatch(email, @"^[^@\s]+@[^@\s]+\.[^@\s]+$"))
            return ApiResponse<StaffDto>.Fail("Please enter a valid email address.");

        if (await _db.Staffs.AnyAsync(x => x.Id != id && x.Email.ToLower() == email))
            return ApiResponse<StaffDto>.Fail($"Email address '{email}' is already registered with another staff member.");

        s.FirstName = request.FirstName.Trim();
        s.LastName = request.LastName.Trim();
        s.FullName = $"{request.FirstName.Trim()} {request.LastName.Trim()}".Trim();
        s.Mobile = mobile;
        s.Email = email;
        s.Address = request.Address;
        s.Role = request.Role;
        s.Department = request.Department;
        s.JoiningDate = request.JoiningDate;
        s.Salary = request.Salary;
        s.Status = request.Status;
        s.ProfileImage = request.ProfileImage;

        await _db.SaveChangesAsync();

        try
        {
            await _tursoSync.SyncStaffAsync(
                s.Id.ToString(), s.FirstName, s.LastName, s.FullName,
                s.Mobile, s.Email, s.Address, s.Role, s.Department,
                s.Salary, s.Status, s.HotelId.ToString()
            );
        }
        catch { }

        return ApiResponse<StaffDto>.Ok(new StaffDto(
            s.Id, s.HotelId, s.FirstName, s.LastName, s.FullName, s.Mobile, s.Email, s.Address, s.Role, s.Department, s.JoiningDate, s.Salary, s.Status, s.ProfileImage, s.CreatedAt
        ), "Staff member updated successfully");
    }

    public async Task<ApiResponse<bool>> DeleteStaffAsync(Guid id)
    {
        var s = await _db.Staffs.FirstOrDefaultAsync(x => x.Id == id);
        if (s == null)
        {
            var allStaff = await _db.Staffs.ToListAsync();
            s = allStaff.FirstOrDefault(x => x.Id.ToString().Equals(id.ToString(), StringComparison.OrdinalIgnoreCase));
        }

        if (s != null)
        {
            var staffAttendances = await _db.StaffAttendances.Where(a => a.StaffId == s.Id).ToListAsync();
            if (staffAttendances.Count > 0)
            {
                _db.StaffAttendances.RemoveRange(staffAttendances);
            }

            _db.Staffs.Remove(s);
            await _db.SaveChangesAsync();

            try
            {
                await _tursoSync.DeleteStaffAsync(s.Id.ToString());
                await _tursoSync.DeleteStaffAsync(id.ToString());
                await _tursoSync.ExecuteSqlAsync($"DELETE FROM staffs WHERE mobile = '{s.Mobile}' OR full_name = '{s.FullName.Replace("'", "''")}';");
                await _tursoSync.ExecuteSqlAsync($"DELETE FROM Staffs WHERE Mobile = '{s.Mobile}' OR FullName = '{s.FullName.Replace("'", "''")}';");
            }
            catch { }
        }
        else
        {
            try
            {
                await _tursoSync.DeleteStaffAsync(id.ToString());
            }
            catch { }
        }

        return ApiResponse<bool>.Ok(true, "Staff member deleted successfully");
    }

    // --- ATTENDANCE ---
    public async Task<ApiResponse<List<StaffAttendanceDto>>> GetAttendanceAsync(DateTime? date = null, Guid? staffId = null)
    {
        var hotelId = GetTenantHotelId();
        var targetDate = (date ?? DateTime.Today).Date;

        var localHotel = await _db.Hotels.FirstOrDefaultAsync(h => h.Id == hotelId);
        if (localHotel == null)
        {
            _db.Hotels.Add(new Hotel
            {
                Id = hotelId,
                Name = "Grand Palace Hotel",
                Slug = "grand-palace",
                Phone = "",
                Email = "",
                Status = "Active"
            });
            try { await _db.SaveChangesAsync(); } catch { }
        }

        var allStaff = await _db.Staffs.Where(s => s.Status == "Active").ToListAsync();
        var activeStaffIds = allStaff.Select(s => s.Id).ToHashSet();

        // Purge orphaned attendance records for staff members that no longer exist
        var orphanedAttendances = await _db.StaffAttendances.Where(a => !activeStaffIds.Contains(a.StaffId)).ToListAsync();
        if (orphanedAttendances.Count > 0)
        {
            _db.StaffAttendances.RemoveRange(orphanedAttendances);
            try { await _db.SaveChangesAsync(); } catch { }
        }

        // If there are NO active staff members, return empty list without generating attendance data
        if (allStaff.Count == 0)
        {
            return ApiResponse<List<StaffAttendanceDto>>.Ok(new List<StaffAttendanceDto>());
        }

        var existingAttendances = await _db.StaffAttendances.Where(a => a.AttendanceDate.Date == targetDate && activeStaffIds.Contains(a.StaffId)).ToListAsync();

        // DEDUPLICATION: Purge any duplicate records for the same staff on the same date
        var duplicates = existingAttendances
            .GroupBy(a => a.StaffId)
            .Where(g => g.Count() > 1)
            .SelectMany(g => g.Skip(1))
            .ToList();

        if (duplicates.Count > 0)
        {
            _db.StaffAttendances.RemoveRange(duplicates);
            try { await _db.SaveChangesAsync(); } catch { }
            existingAttendances = await _db.StaffAttendances.Where(a => a.AttendanceDate.Date == targetDate && activeStaffIds.Contains(a.StaffId)).ToListAsync();
        }

        bool hasNew = false;
        foreach (var s in allStaff)
        {
            if (!existingAttendances.Any(a => a.StaffId == s.Id))
            {
                var newAtt = new StaffAttendance
                {
                    HotelId = hotelId,
                    StaffId = s.Id,
                    AttendanceDate = targetDate,
                    CheckInTime = "09:00",
                    CheckOutTime = "18:00",
                    Status = AttendanceStatus.Present,
                    Notes = "Default attendance entry"
                };
                _db.StaffAttendances.Add(newAtt);
                hasNew = true;

                // Sync new default entry to Turso Cloud DB
                try
                {
                    await _tursoSync.SyncAttendanceAsync(
                        newAtt.Id.ToString(), newAtt.HotelId.ToString(), newAtt.StaffId.ToString(),
                        newAtt.AttendanceDate.ToString("yyyy-MM-dd"), newAtt.CheckInTime, newAtt.CheckOutTime,
                        newAtt.Status.ToString(), newAtt.Notes, s.FullName, s.Role
                    );
                }
                catch { }
            }
        }

        if (hasNew)
        {
            try
            {
                await _db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Attendance Save Warning] {ex.Message}");
            }
        }

        var query = _db.StaffAttendances.Include(a => a.Staff).AsQueryable();
        query = query.Where(a => a.AttendanceDate.Date == targetDate && activeStaffIds.Contains(a.StaffId));

        if (staffId.HasValue && staffId.Value != Guid.Empty)
        {
            query = query.Where(a => a.StaffId == staffId.Value);
        }

        var list = await query.OrderBy(a => a.Staff.FirstName).ToListAsync();

        // Ensure strictly 1 attendance entry per staff member in returned DTO list
        var uniqueList = list.GroupBy(a => a.StaffId).Select(g => g.First()).ToList();

        var dtos = uniqueList.Select(a => new StaffAttendanceDto(
            a.Id, a.HotelId, a.StaffId, a.Staff?.FullName ?? "Staff", a.Staff?.Department ?? "General",
            a.AttendanceDate, a.CheckInTime, a.CheckOutTime, a.Status, a.Notes, a.CreatedAt
        )).ToList();

        return ApiResponse<List<StaffAttendanceDto>>.Ok(dtos);
    }

    public async Task<ApiResponse<StaffAttendanceDto>> MarkAttendanceAsync(CreateStaffAttendanceDto request)
    {
        var hotelId = GetTenantHotelId();

        var staff = await _db.Staffs.FirstOrDefaultAsync(s => s.Id == request.StaffId && s.Status == "Active");
        if (staff == null) return ApiResponse<StaffAttendanceDto>.Fail("Active staff member not found");

        var rawDate = request.AttendanceDate;
        var targetDate = (rawDate.Kind == DateTimeKind.Utc ? rawDate.ToLocalTime() : rawDate).Date;
        var today = DateTime.Today;

        if (targetDate < today)
        {
            return ApiResponse<StaffAttendanceDto>.Fail("Attendance cannot be marked for past dates. Only today's or future attendance is allowed.");
        }

        var existingList = await _db.StaffAttendances.Where(a => a.StaffId == request.StaffId && a.AttendanceDate.Date == targetDate).ToListAsync();

        StaffAttendance attendance;

        if (existingList.Count > 0)
        {
            attendance = existingList.First();
            attendance.CheckInTime = request.CheckInTime;
            attendance.CheckOutTime = request.CheckOutTime;
            attendance.Status = request.Status;
            attendance.Notes = request.Notes;

            // Remove any duplicate entries for the same staff on same date
            if (existingList.Count > 1)
            {
                _db.StaffAttendances.RemoveRange(existingList.Skip(1));
            }

            await _db.SaveChangesAsync();
        }
        else
        {
            attendance = new StaffAttendance
            {
                HotelId = hotelId,
                StaffId = request.StaffId,
                AttendanceDate = targetDate,
                CheckInTime = request.CheckInTime,
                CheckOutTime = request.CheckOutTime,
                Status = request.Status,
                Notes = request.Notes
            };

            _db.StaffAttendances.Add(attendance);
            await _db.SaveChangesAsync();
        }

        // Sync to Turso Cloud DB
        try
        {
            await _tursoSync.SyncAttendanceAsync(
                attendance.Id.ToString(), attendance.HotelId.ToString(), attendance.StaffId.ToString(),
                attendance.AttendanceDate.ToString("yyyy-MM-dd"), attendance.CheckInTime, attendance.CheckOutTime,
                attendance.Status.ToString(), attendance.Notes, staff.FullName, staff.Role
            );
        }
        catch { }

        return ApiResponse<StaffAttendanceDto>.Ok(new StaffAttendanceDto(
            attendance.Id, attendance.HotelId, attendance.StaffId, staff.FullName, staff.Department, attendance.AttendanceDate, attendance.CheckInTime, attendance.CheckOutTime, attendance.Status, attendance.Notes, attendance.CreatedAt
        ), "Attendance recorded successfully");
    }

    public async Task<ApiResponse<StaffAttendanceDto>> UpdateAttendanceAsync(Guid id, UpdateStaffAttendanceDto request)
    {
        var attendance = await _db.StaffAttendances.Include(a => a.Staff).FirstOrDefaultAsync(a => a.Id == id);
        if (attendance == null) return ApiResponse<StaffAttendanceDto>.Fail("Attendance record not found");

        if (attendance.AttendanceDate.Date < DateTime.Today)
        {
            return ApiResponse<StaffAttendanceDto>.Fail("Attendance for past dates cannot be modified.");
        }

        attendance.CheckInTime = request.CheckInTime;
        attendance.CheckOutTime = request.CheckOutTime;
        attendance.Status = request.Status;
        attendance.Notes = request.Notes;

        await _db.SaveChangesAsync();

        // Sync to Turso Cloud DB
        try
        {
            await _tursoSync.SyncAttendanceAsync(
                attendance.Id.ToString(), attendance.HotelId.ToString(), attendance.StaffId.ToString(),
                attendance.AttendanceDate.ToString("yyyy-MM-dd"), attendance.CheckInTime, attendance.CheckOutTime,
                attendance.Status.ToString(), attendance.Notes, attendance.Staff?.FullName, attendance.Staff?.Role
            );
        }
        catch { }

        return ApiResponse<StaffAttendanceDto>.Ok(new StaffAttendanceDto(
            attendance.Id, attendance.HotelId, attendance.StaffId, attendance.Staff?.FullName ?? "Staff", attendance.Staff?.Department ?? "General", attendance.AttendanceDate, attendance.CheckInTime, attendance.CheckOutTime, attendance.Status, attendance.Notes, attendance.CreatedAt
        ), "Attendance record updated");
    }

    public async Task<ApiResponse<List<StaffMonthlySummaryDto>>> GetMonthlyAttendanceSummaryAsync(int? month = null, int? year = null)
    {
        var targetMonth = month ?? DateTime.UtcNow.Month;
        var targetYear = year ?? DateTime.UtcNow.Year;

        var allStaff = await _db.Staffs.Where(s => s.Status == "Active").OrderBy(s => s.FirstName).ToListAsync();
        if (allStaff.Count == 0)
        {
            return ApiResponse<List<StaffMonthlySummaryDto>>.Ok(new List<StaffMonthlySummaryDto>());
        }

        var attendances = await _db.StaffAttendances
            .Where(a => a.AttendanceDate.Month == targetMonth && a.AttendanceDate.Year == targetYear)
            .ToListAsync();

        var summaries = new List<StaffMonthlySummaryDto>();

        foreach (var s in allStaff)
        {
            var staffAtts = attendances.Where(a => a.StaffId == s.Id).ToList();

            int present = staffAtts.Count(a => a.Status == AttendanceStatus.Present);
            int absent = staffAtts.Count(a => a.Status == AttendanceStatus.Absent);
            int halfDay = staffAtts.Count(a => a.Status == AttendanceStatus.HalfDay);
            int leave = staffAtts.Count(a => a.Status == AttendanceStatus.Leave);
            int total = staffAtts.Count;

            double pct = total > 0 ? Math.Round(((present + (halfDay * 0.5)) / total) * 100, 1) : 0.0;

            summaries.Add(new StaffMonthlySummaryDto(
                s.Id, s.FullName, s.Role, s.Department, targetMonth, targetYear,
                present, absent, halfDay, leave, total, pct
            ));
        }

        return ApiResponse<List<StaffMonthlySummaryDto>>.Ok(summaries);
    }
}
