using HotelSaaS.Application.Common.Models;
using HotelSaaS.Application.DTOs;
using HotelSaaS.Application.Interfaces;
using HotelSaaS.Domain.Entities;
using HotelSaaS.Domain.Enums;
using HotelSaaS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HotelSaaS.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly ApplicationDbContext _db;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenGenerator _jwtGenerator;
    private readonly ITursoSyncService _tursoSync;

    public AuthService(ApplicationDbContext db, IPasswordHasher passwordHasher, IJwtTokenGenerator jwtGenerator, ITursoSyncService tursoSync)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _jwtGenerator = jwtGenerator;
        _tursoSync = tursoSync;
    }

    public async Task<ApiResponse<AuthResponseDto>> LoginAsync(LoginRequestDto request)
    {
        var email = (request.Email ?? "").Trim().ToLower();

        Console.WriteLine("===== LOGIN API CALLED =====");
        Console.WriteLine($"EMAIL: {email}, ROLE PREFERENCE: {request.Role}");

        // 1. Email required
        if (string.IsNullOrWhiteSpace(email))
        {
            return ApiResponse<AuthResponseDto>.Fail(
                "Email address is required."
            );
        }



        // 2. Fetch profile directly from Turso Cloud DB ONLY
        var user = await _tursoSync.FetchProfileByEmailFromTursoAsync(email);

        if (user == null)
        {
            Console.WriteLine("===== USER NOT FOUND IN TURSO DB =====");
            return ApiResponse<AuthResponseDto>.Fail(
                "Email is not registered. Please complete registration first."
            );
        }

        // Fetch Hotel entity if required for tenant validation
        if (user.Hotel == null && user.HotelId.HasValue)
        {
            user.Hotel = await _tursoSync.FetchHotelByIdFromTursoAsync(user.HotelId.Value)
                ?? await _db.Hotels.FirstOrDefaultAsync(h => h.Id == user.HotelId.Value);
        }

        string activeRole = UserRole.HotelOwner.ToString();
        bool passwordValid = false;

        // 3. Explicit role matching or auto-detecting password match
        if (request.Role?.Equals("StaffManager", StringComparison.OrdinalIgnoreCase) == true)
        {
            // Logging in specifically as StaffManager
            var hashToTest = !string.IsNullOrWhiteSpace(user.StaffPasswordHash) ? user.StaffPasswordHash : user.PasswordHash;
            passwordValid = _passwordHasher.VerifyPassword(request.Password, hashToTest);
            activeRole = UserRole.StaffManager.ToString();
        }
        else if (request.Role?.Equals("HotelOwner", StringComparison.OrdinalIgnoreCase) == true)
        {
            // Logging in specifically as HotelOwner
            passwordValid = _passwordHasher.VerifyPassword(request.Password, user.PasswordHash);
            activeRole = UserRole.HotelOwner.ToString();
        }
        else
        {
            // Auto-detect based on which password matches
            if (_passwordHasher.VerifyPassword(request.Password, user.PasswordHash))
            {
                passwordValid = true;
                activeRole = UserRole.HotelOwner.ToString();
            }
            else if (!string.IsNullOrWhiteSpace(user.StaffPasswordHash) && _passwordHasher.VerifyPassword(request.Password, user.StaffPasswordHash))
            {
                passwordValid = true;
                activeRole = UserRole.StaffManager.ToString();
            }
        }

        if (!passwordValid)
        {
            return ApiResponse<AuthResponseDto>.Fail(
                "Invalid password. Please enter correct password."
            );
        }

        // 4. Super Admin override or Account Status check (Status == 1 / true in Turso DB)
        if (user.IsSuperAdmin)
        {
            activeRole = UserRole.SuperAdmin.ToString();
        }
        else
        {
            // Check only user.Status (1 = Active/Approved, 0 = Pending)
            if (!user.Status)
            {
                return ApiResponse<AuthResponseDto>.Fail(
                    "Your account is pending approval by SuperAdmin."
                );
            }
        }

        // 5. Login information
        Guid? hotelId = user.HotelId;
        string hotelName = user.Hotel?.Name ?? "";
        string hotelCode = user.HotelCode ?? user.Hotel?.HotelCode ?? "";

        // 6. Generate JWT with the active role (HotelOwner vs StaffManager)
        var token = _jwtGenerator.GenerateToken(
            user,
            hotelId,
            activeRole
        );

        // 7. Response
        var dto = new AuthResponseDto(
            Token: token,
            UserId: user.Id,
            FullName: user.FullName,
            Email: user.Email,
            HotelId: hotelId,
            HotelName: hotelName,
            HotelCode: hotelCode,
            Role: activeRole,
            IsSuperAdmin: user.IsSuperAdmin
        );

        return ApiResponse<AuthResponseDto>.Ok(
            dto,
            "Login successful"
        );
    }

	public async Task<ApiResponse<AuthResponseDto>> RegisterHotelAsync(RegisterHotelRequestDto request)
	{
		// --- 1. BACKEND INPUT VALIDATIONS ---
		if (string.IsNullOrWhiteSpace(request.HotelName))
		{
			return ApiResponse<AuthResponseDto>.Fail("Hotel name is required.");
		}

		if (string.IsNullOrWhiteSpace(request.OwnerFullName))
		{
			return ApiResponse<AuthResponseDto>.Fail("Owner full name is required.");
		}

		if (string.IsNullOrWhiteSpace(request.OwnerEmail))
		{
			return ApiResponse<AuthResponseDto>.Fail("Owner email address is required.");
		}

		if (string.IsNullOrWhiteSpace(request.OwnerPassword))
		{
			return ApiResponse<AuthResponseDto>.Fail("Owner password is required.");
		}

		var staffPassword = string.IsNullOrWhiteSpace(request.StaffPassword) ? request.OwnerPassword : request.StaffPassword;

		var rawSlug = string.IsNullOrWhiteSpace(request.HotelSlug)
			? request.HotelName.Trim().ToLowerInvariant().Replace(" ", "-")
			: request.HotelSlug.Trim().ToLowerInvariant();

		// Check if user email is already registered
		var normalizedEmail = request.OwnerEmail?.Trim().ToLowerInvariant();

		if (string.IsNullOrWhiteSpace(normalizedEmail))
		{
			return ApiResponse<AuthResponseDto>.Fail("Email is required.");
		}

		// Check if user email is already registered in Turso Cloud DB
		var existingUser = await _tursoSync.FetchProfileByEmailFromTursoAsync(normalizedEmail);
		if (existingUser != null)
		{
			return ApiResponse<AuthResponseDto>.Fail(
				"This email is already registered. Please login or use another email for registration.");
		}

		// Purge stale local profile if present from previous local state so DB insert never conflicts
		var staleLocal = await _db.Profiles.FirstOrDefaultAsync(p => p.Email != null && p.Email.Trim().ToLower() == normalizedEmail);
		if (staleLocal != null)
		{
			_db.Profiles.Remove(staleLocal);
			await _db.SaveChangesAsync();
		}

		var existingHotelSlug = await _db.Hotels.AnyAsync(h => h.Slug.ToLower() == rawSlug);
		if (existingHotelSlug)
		{
			rawSlug = $"{rawSlug}-{Random.Shared.Next(100, 999)}";
		}

		Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction? transaction = null;
		if (_db.Database.IsRelational())
		{
			transaction = await _db.Database.BeginTransactionAsync();
		}

		try
		{
			// --- 2. GENERATE UNIFIED SEQUENTIAL ID FROM TURSO CLOUD DB ---
			var tursoMaxHotel = await _tursoSync.GetMaxTrainIdFromTursoAsync("hotels");
			var tursoMaxProfile = await _tursoSync.GetMaxTrainIdFromTursoAsync("Profiles");
			var localMaxHotel = await _db.Hotels.IgnoreQueryFilters().AnyAsync()
				? await _db.Hotels.IgnoreQueryFilters().Select(h => (int?)EF.Property<int>(h, "trainid")).MaxAsync() ?? 0
				: 0;
			var localMaxProfile = await _db.Profiles.IgnoreQueryFilters().AnyAsync()
				? await _db.Profiles.IgnoreQueryFilters().Select(p => (int?)EF.Property<int>(p, "trainid")).MaxAsync() ?? 0
				: 0;

			var unifiedNextNumber = Math.Max(Math.Max(tursoMaxHotel, tursoMaxProfile), Math.Max(localMaxHotel, localMaxProfile)) + 1;

			var nextHotelGuid = Guid.Parse($"00000000-0000-0000-0000-{unifiedNextNumber:D12}");
			var ownerProfileGuid = Guid.Parse($"00000000-0000-0000-0001-{unifiedNextNumber:D12}");
			var generatedHotelCode = $"HTL-{unifiedNextNumber:D3}";

			// --- 3. CREATE HOTEL ENTITY (STATUS = "0") ---
			var hotel = new Hotel
			{
				Id = nextHotelGuid,
				Name = request.HotelName.Trim(),
				Slug = rawSlug,
				HotelCode = generatedHotelCode,
				Phone = request.Phone ?? request.OwnerPhone ?? "",
				Email = request.Email ?? request.OwnerEmail,
				Address = request.Address ?? "",
				City = request.City ?? "",
				State = request.State ?? "",
				Country = request.Country ?? "India",
				Pincode = request.Pincode ?? "",
				CheckInTime = "14:00",
				CheckOutTime = "11:00",
				Currency = "INR",
				Timezone = "Asia/Kolkata",
				TaxRate = "12%",
				Status = "PendingApproval"
			};

			_db.Hotels.Add(hotel);

			// --- 4. CREATE SINGLE PROFILE ROW WITH BOTH PASSWORDS ---
			var ownerProfile = new Profile
			{
				Id = ownerProfileGuid,
				FullName = request.OwnerFullName.Trim(),
				Email = request.OwnerEmail.Trim().ToLower(),
				Phone = request.OwnerPhone ?? "",
				PasswordHash = request.OwnerPassword,
				StaffPasswordHash = staffPassword,
				IsSuperAdmin = false,
				HotelId = hotel.Id,
				HotelCode = generatedHotelCode,
				Role = UserRole.HotelOwner,
				Status = false
			};
			_db.Profiles.Add(ownerProfile);

			await _db.SaveChangesAsync();

			// --- 5. CREATE DEFAULT ROOM TYPES ---
			var defaultRoomTypes = new List<RoomType>
			{
				new RoomType { Id = Guid.NewGuid(), HotelId = hotel.Id, HotelCode = generatedHotelCode, Name = "Deluxe Room", Slug = "deluxe-room", BasePrice = 8500, MaxAdults = 2, MaxChildren = 1, BedType = "King", Status = "Active" },
				new RoomType { Id = Guid.NewGuid(), HotelId = hotel.Id, HotelCode = generatedHotelCode, Name = "Executive Suite", Slug = "executive-suite", BasePrice = 15000, MaxAdults = 2, MaxChildren = 2, BedType = "King Suite", Status = "Active" },
				new RoomType { Id = Guid.NewGuid(), HotelId = hotel.Id, HotelCode = generatedHotelCode, Name = "Standard Room", Slug = "standard-room", BasePrice = 5000, MaxAdults = 2, MaxChildren = 0, BedType = "Double", Status = "Active" }
			};
			_db.RoomTypes.AddRange(defaultRoomTypes);

			await _db.SaveChangesAsync();

			if (transaction != null) await transaction.CommitAsync();

			// --- 6. SYNC TO TURSO CLOUD DB WITH UNIFIED TRAIN ID ---
			try
			{
				await _tursoSync.SyncHotelAsync(
					hotel.Id.ToString(), hotel.Name, hotel.Slug, hotel.Phone,
					hotel.Email, hotel.Address, hotel.City, hotel.State,
					hotel.Country, hotel.Pincode, hotel.Status, hotel.HotelCode,
					trainId: unifiedNextNumber
				);

				await _tursoSync.SyncProfileAsync(
					ownerProfile.Id.ToString(), ownerProfile.FullName, ownerProfile.Email,
					ownerProfile.Phone, ownerProfile.PasswordHash, ownerProfile.IsSuperAdmin,
					ownerProfile.Status, ownerProfile.HotelId, ownerProfile.Role.ToString(),
					ownerProfile.StaffPasswordHash,
					trainId: unifiedNextNumber
				);
			}
			catch { }

			var dto = new AuthResponseDto(
				Token: string.Empty,
				UserId: ownerProfile.Id,
				FullName: ownerProfile.FullName,
				Email: ownerProfile.Email,
				HotelId: hotel.Id,
				HotelName: hotel.Name,
				HotelCode: hotel.HotelCode,
				Role: UserRole.HotelOwner.ToString(),
				IsSuperAdmin: false
			);

			return ApiResponse<AuthResponseDto>.Ok(dto, "Hotel registered successfully! Owner & Staff passwords saved in your single profile. Your registration is submitted for SuperAdmin approval.");
		}
		catch (Exception ex)
		{
			if (transaction != null) await transaction.RollbackAsync();
			return ApiResponse<AuthResponseDto>.Fail($"Registration failed: {ex.Message}");
		}
	}

	public async Task<ApiResponse<UserDto>> GetCurrentUserAsync(Guid userId)
    {
        var localUser = await _db.Profiles.FirstOrDefaultAsync(p => p.Id == userId);
        if (localUser == null)
            return ApiResponse<UserDto>.Fail("User not found");

        var user = await _tursoSync.FetchProfileByEmailFromTursoAsync(localUser.Email) ?? localUser;

        var dto = new UserDto(
            Id: user.Id,
            FullName: user.FullName,
            Email: user.Email,
            Phone: user.Phone,
            Role: user.IsSuperAdmin ? "SuperAdmin" : user.Role.ToString(),
            Status: user.Status ? "Active" : "Inactive"
        );

        return ApiResponse<UserDto>.Ok(dto);
    }

    public async Task<ApiResponse<bool>> ResetPasswordAsync(ResetPasswordRequestDto request)
    {
        var email = (request.Email ?? "").Trim().ToLower();
        var newPassword = (request.NewPassword ?? "").Trim();
        var targetRole = (request.TargetRole ?? "Both").Trim();

        if (string.IsNullOrWhiteSpace(email))
            return ApiResponse<bool>.Fail("Email address is required.");

        if (string.IsNullOrWhiteSpace(newPassword))
            return ApiResponse<bool>.Fail("New password is required.");

        // Fetch profile from Turso or local DB
        var userFromTurso = await _tursoSync.FetchProfileByEmailFromTursoAsync(email);
        var localProfile = await _db.Profiles.FirstOrDefaultAsync(p => p.Email != null && p.Email.ToLower() == email);

        if (userFromTurso == null && localProfile == null)
        {
            try
            {
                var tursoStaff = await _tursoSync.FetchStaffFromTursoAsync();
                var matchedStaff = tursoStaff?.FirstOrDefault(s => s.Email != null && s.Email.Trim().ToLower() == email);
                if (matchedStaff != null)
                {
                    userFromTurso = new Profile
                    {
                        Id = matchedStaff.Id,
                        Email = matchedStaff.Email,
                        FullName = matchedStaff.FullName,
                        Phone = matchedStaff.Mobile ?? "",
                        HotelId = matchedStaff.HotelId,
                        Role = UserRole.StaffManager,
                        Status = true,
                        PasswordHash = newPassword,
                        StaffPasswordHash = newPassword
                    };
                }
            }
            catch { }
        }

        if (userFromTurso == null && localProfile == null)
        {
            return ApiResponse<bool>.Fail("No registered hotel or staff account found for this email address.");
        }

        var profileToUpdate = localProfile ?? new Profile
        {
            Id = userFromTurso?.Id ?? Guid.NewGuid(),
            Email = email,
            FullName = userFromTurso?.FullName ?? "Hotel Owner",
            Phone = userFromTurso?.Phone ?? "",
            HotelId = userFromTurso?.HotelId,
            IsSuperAdmin = userFromTurso?.IsSuperAdmin ?? false,
            Status = true
        };

        if (userFromTurso != null)
        {
            if (!string.IsNullOrWhiteSpace(userFromTurso.PasswordHash))
                profileToUpdate.PasswordHash = userFromTurso.PasswordHash;
            if (!string.IsNullOrWhiteSpace(userFromTurso.StaffPasswordHash))
                profileToUpdate.StaffPasswordHash = userFromTurso.StaffPasswordHash;
            if (userFromTurso.HotelId.HasValue && userFromTurso.HotelId != Guid.Empty)
                profileToUpdate.HotelId = userFromTurso.HotelId;
            profileToUpdate.Role = userFromTurso.Role;
            profileToUpdate.Status = userFromTurso.Status;
        }

        if (targetRole.Equals("HotelOwner", StringComparison.OrdinalIgnoreCase))
        {
            profileToUpdate.PasswordHash = newPassword;
            if (string.IsNullOrWhiteSpace(profileToUpdate.StaffPasswordHash))
                profileToUpdate.StaffPasswordHash = newPassword;
        }
        else if (targetRole.Equals("StaffManager", StringComparison.OrdinalIgnoreCase))
        {
            profileToUpdate.StaffPasswordHash = newPassword;
            if (string.IsNullOrWhiteSpace(profileToUpdate.PasswordHash))
                profileToUpdate.PasswordHash = newPassword;
        }
        else
        {
            profileToUpdate.PasswordHash = newPassword;
            profileToUpdate.StaffPasswordHash = newPassword;
        }

        if (localProfile == null)
        {
            _db.Profiles.Add(profileToUpdate);
        }

        await _db.SaveChangesAsync();

        // Sync updated password to Turso Cloud DB
        try
        {
            var pHash = !string.IsNullOrWhiteSpace(profileToUpdate.PasswordHash) ? profileToUpdate.PasswordHash : newPassword;
            var sHash = !string.IsNullOrWhiteSpace(profileToUpdate.StaffPasswordHash) ? profileToUpdate.StaffPasswordHash : newPassword;

            await _tursoSync.SyncProfileAsync(
                profileToUpdate.Id.ToString(),
                profileToUpdate.FullName ?? "Owner",
                profileToUpdate.Email ?? email,
                profileToUpdate.Phone ?? "",
                pHash,
                profileToUpdate.IsSuperAdmin,
                profileToUpdate.Status,
                profileToUpdate.HotelId,
                profileToUpdate.Role.ToString(),
                sHash
            );
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Turso sync error on password reset: {ex.Message}");
        }

        return ApiResponse<bool>.Ok(true, "🎉 Password updated and saved to Turso cloud database successfully!");
    }
}
