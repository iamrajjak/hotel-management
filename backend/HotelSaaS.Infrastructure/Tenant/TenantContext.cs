using HotelSaaS.Application.Common.Interfaces;

namespace HotelSaaS.Infrastructure.Tenant;

public class TenantContext : ITenantContext
{
    public Guid? HotelId { get; private set; }
    public Guid? UserId { get; private set; }
    public string? UserRole { get; private set; }
    public bool IsSuperAdmin { get; private set; }

    public void SetTenant(Guid hotelId, Guid userId, string role, bool isSuperAdmin = false)
    {
        HotelId = hotelId;
        UserId = userId;
        UserRole = role;
        IsSuperAdmin = isSuperAdmin;
    }
}
