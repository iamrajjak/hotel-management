using System.Security.Claims;
using HotelSaaS.Application.Common.Interfaces;
using HotelSaaS.Infrastructure.Persistence;
using HotelSaaS.Infrastructure.Services;

namespace HotelSaaS.Api.Middleware;

public class TenantMiddleware
{
    private readonly RequestDelegate _next;

    public TenantMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, ITenantContext tenantContext)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var hotelIdClaim = context.User.FindFirst("hotel_id")?.Value;
            var roleClaim = context.User.FindFirst(ClaimTypes.Role)?.Value ?? "User";
            var superAdminClaim = context.User.FindFirst("is_super_admin")?.Value;

            Guid.TryParse(userIdClaim, out var userId);
            Guid.TryParse(hotelIdClaim, out var hotelId);
            bool isSuperAdmin = bool.TryParse(superAdminClaim, out var sa) && sa;

            if (hotelId != Guid.Empty)
            {
                tenantContext.SetTenant(hotelId, userId, roleClaim, isSuperAdmin);
            }
            else if (isSuperAdmin)
            {
                tenantContext.SetTenant(Guid.Empty, userId, roleClaim, true);
            }
        }

        if (tenantContext.HotelId == null)
        {
            // Do not force fallback to Tenant A; set unauthenticated Guest tenant context cleanly
            tenantContext.SetTenant(Guid.Empty, Guid.Empty, "Guest", false);
        }

        await _next(context);
    }
}
