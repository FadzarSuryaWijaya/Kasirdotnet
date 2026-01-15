using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WarungKopiAPI.Data;
using WarungKopiAPI.DTOs;

namespace WarungKopiAPI.Controllers;

[ApiController]
[Route("api/audit")]
[Authorize(Roles = "Admin")]
public class AuditController : ControllerBase
{
    private readonly WarungKopiDbContext _context;

    public AuditController(WarungKopiDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Get audit logs
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetLogs(
        [FromQuery] DateTime? dateFrom = null,
        [FromQuery] DateTime? dateTo = null,
        [FromQuery] string? action = null,
        [FromQuery] string? entityType = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var query = _context.AuditLogs
            .AsNoTracking()
            .Include(a => a.User)
            .AsQueryable();

        if (dateFrom.HasValue)
            query = query.Where(a => a.CreatedAt >= dateFrom.Value);
        if (dateTo.HasValue)
            query = query.Where(a => a.CreatedAt <= dateTo.Value.AddDays(1));
        if (!string.IsNullOrEmpty(action))
            query = query.Where(a => a.ActionName.Contains(action));
        if (!string.IsNullOrEmpty(entityType))
            query = query.Where(a => a.EntityType == entityType);

        var total = await query.CountAsync();

        var logs = await query
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new AuditLogResponse
            {
                Id = a.Id.ToString(),
                Action = a.Action.ToString(),
                ActionName = a.ActionName,
                EntityType = a.EntityType,
                EntityId = a.EntityId,
                Description = a.Description,
                UserName = a.User != null ? a.User.Name : null,
                CreatedAt = a.CreatedAt
            })
            .ToListAsync();

        return Ok(new
        {
            items = logs,
            total,
            page,
            pageSize,
            pages = (total + pageSize - 1) / pageSize
        });
    }
}
