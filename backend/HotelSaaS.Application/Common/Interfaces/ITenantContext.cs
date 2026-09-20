namespace HotelSaaS.Application.Common.Interfaces;

public interface ITenantContext
{
    Guid? HotelId { get; }
    Guid? UserId { get; }
    string? UserRole { get; }
    bool IsSuperAdmin { get; }
    void SetTenant(Guid hotelId, Guid userId, string role, bool isSuperAdmin = false);
}
