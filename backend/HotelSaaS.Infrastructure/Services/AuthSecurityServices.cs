using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using HotelSaaS.Domain.Entities;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace HotelSaaS.Infrastructure.Services;

public interface IPasswordHasher
{
    string HashPassword(string password);
    bool VerifyPassword(string password, string passwordHash);
}

public class PasswordHasher : IPasswordHasher
{
    public string HashPassword(string password) => password;
    public bool VerifyPassword(string password, string passwordHash)
    {
        if (string.Equals(password, passwordHash, StringComparison.Ordinal))
            return true;

        try
        {
            return BCrypt.Net.BCrypt.Verify(password, passwordHash);
        }
        catch
        {
            return false;
        }
    }
}

public interface IJwtTokenGenerator
{
    string GenerateToken(Profile user, Guid? hotelId, string role);
}

public class JwtTokenGenerator : IJwtTokenGenerator
{
    private readonly IConfiguration _config;

    public JwtTokenGenerator(IConfiguration config)
    {
        _config = config;
    }

    public string GenerateToken(Profile user, Guid? hotelId, string role)
    {
        var keyStr = _config["Jwt:Key"] ?? "SUPER_SECRET_JWT_KEY_FOR_HOTEL_SAAS_DEVELOPMENT_123456";
        var issuer = _config["Jwt:Issuer"] ?? "HotelSaaS.Api";
        var audience = _config["Jwt:Audience"] ?? "HotelSaaS.Client";

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(keyStr));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Name, user.FullName),
            new(ClaimTypes.Role, role),
            new("is_super_admin", user.IsSuperAdmin.ToString().ToLower())
        };

        if (hotelId.HasValue)
        {
            claims.Add(new Claim("hotel_id", hotelId.Value.ToString()));
        }

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
