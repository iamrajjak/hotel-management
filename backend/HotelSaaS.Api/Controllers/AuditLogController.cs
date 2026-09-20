using HotelSaaS.Application.Common.Models;
using HotelSaaS.Domain.Entities;
using HotelSaaS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HotelSaaS.Api.Controllers;

[ApiController]
[Route("api/audit-logs")]
public class AuditLogController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public AuditLogController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetAuditLogs([FromQuery] int limit = 20)
    {
        var logs = await _db.AuditLogs
            .OrderByDescending(a => a.CreatedAt)
            .Take(limit)
            .Select(a => new
            {
                a.Id,
                a.HotelId,
                a.Action,
                a.Entity,
                a.EntityId,
                a.MetadataJson,
                a.CreatedAt
            })
            .ToListAsync();

        return Ok(ApiResponse<object>.Ok(logs, "Audit logs retrieved successfully"));
    }
}
