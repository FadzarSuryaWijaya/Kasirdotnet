using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using WarungKopiAPI.Data;
using WarungKopiAPI.DTOs;
using WarungKopiAPI.Models;

namespace WarungKopiAPI.Controllers;

[ApiController]
[Route("api/sessions")]
[Authorize]
public class SessionsController : ControllerBase
{
    private readonly WarungKopiDbContext _context;

    public SessionsController(WarungKopiDbContext context)
    {
        _context = context;
    }

    private Guid GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(claim, out var id) ? id : Guid.Empty;
    }

    /// <summary>
    /// Get current user's active session
    /// </summary>
    [HttpGet("active")]
    public async Task<IActionResult> GetActiveSession()
    {
        var userId = GetUserId();
        var session = await _context.CashierSessions
            .Include(s => s.Cashier)
            .FirstOrDefaultAsync(s => s.CashierId == userId && s.Status == SessionStatus.Open);

        if (session == null)
            return Ok(new ActiveSessionResponse { HasActiveSession = false });

        // Calculate current totals
        var transactions = await _context.Transactions
            .Where(t => t.SessionId == session.Id)
            .ToListAsync();

        var totalCash = transactions.Where(t => t.PaymentMethod == "Cash").Sum(t => t.Total);
        var totalNonCash = transactions.Where(t => t.PaymentMethod != "Cash").Sum(t => t.Total);

        return Ok(new ActiveSessionResponse
        {
            HasActiveSession = true,
            Session = new CashierSessionResponse
            {
                Id = session.Id.ToString(),
                CashierId = session.CashierId.ToString(),
                CashierName = session.Cashier?.Name ?? "Unknown",
                StartTime = session.StartTime,
                EndTime = session.EndTime,
                OpeningCash = session.OpeningCash,
                ClosingCash = session.ClosingCash,
                ExpectedCash = session.OpeningCash + totalCash,
                Difference = session.Difference,
                TotalSales = totalCash + totalNonCash,
                TotalCash = totalCash,
                TotalNonCash = totalNonCash,
                TotalTransactions = transactions.Count,
                Status = session.Status.ToString(),
                Notes = session.Notes
            }
        });
    }

    /// <summary>
    /// Start a new shift/session
    /// </summary>
    [HttpPost("start")]
    public async Task<IActionResult> StartSession([FromBody] StartSessionRequest request)
    {
        var userId = GetUserId();

        // Check if already has active session
        var existing = await _context.CashierSessions
            .FirstOrDefaultAsync(s => s.CashierId == userId && s.Status == SessionStatus.Open);

        if (existing != null)
            return BadRequest(new { message = "Anda sudah memiliki shift aktif. Akhiri shift terlebih dahulu." });

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            return Unauthorized();

        var session = new CashierSession
        {
            Id = Guid.NewGuid(),
            CashierId = userId,
            StartTime = DateTime.UtcNow,
            OpeningCash = request.OpeningCash,
            Status = SessionStatus.Open
        };

        _context.CashierSessions.Add(session);
        await _context.SaveChangesAsync();

        return Ok(new CashierSessionResponse
        {
            Id = session.Id.ToString(),
            CashierId = session.CashierId.ToString(),
            CashierName = user.Name,
            StartTime = session.StartTime,
            OpeningCash = session.OpeningCash,
            ExpectedCash = session.OpeningCash,
            TotalSales = 0,
            TotalCash = 0,
            TotalNonCash = 0,
            TotalTransactions = 0,
            Status = "Open"
        });
    }

    /// <summary>
    /// End current shift/session with cash count
    /// </summary>
    [HttpPost("end")]
    public async Task<IActionResult> EndSession([FromBody] EndSessionRequest request)
    {
        var userId = GetUserId();

        var session = await _context.CashierSessions
            .Include(s => s.Cashier)
            .FirstOrDefaultAsync(s => s.CashierId == userId && s.Status == SessionStatus.Open);

        if (session == null)
            return BadRequest(new { message = "Tidak ada shift aktif" });

        // Calculate totals from transactions
        var transactions = await _context.Transactions
            .Where(t => t.SessionId == session.Id)
            .ToListAsync();

        var totalCash = transactions.Where(t => t.PaymentMethod == "Cash").Sum(t => t.Total);
        var totalNonCash = transactions.Where(t => t.PaymentMethod != "Cash").Sum(t => t.Total);
        var expectedCash = session.OpeningCash + totalCash;

        session.EndTime = DateTime.UtcNow;
        session.ClosingCash = request.ClosingCash;
        session.ExpectedCash = expectedCash;
        session.Difference = request.ClosingCash - expectedCash;
        session.TotalSales = totalCash + totalNonCash;
        session.TotalCash = totalCash;
        session.TotalNonCash = totalNonCash;
        session.TotalTransactions = transactions.Count;
        session.Status = SessionStatus.Closed;
        session.Notes = request.Notes;

        await _context.SaveChangesAsync();

        return Ok(new CashierSessionResponse
        {
            Id = session.Id.ToString(),
            CashierId = session.CashierId.ToString(),
            CashierName = session.Cashier?.Name ?? "Unknown",
            StartTime = session.StartTime,
            EndTime = session.EndTime,
            OpeningCash = session.OpeningCash,
            ClosingCash = session.ClosingCash,
            ExpectedCash = session.ExpectedCash,
            Difference = session.Difference,
            TotalSales = session.TotalSales,
            TotalCash = session.TotalCash,
            TotalNonCash = session.TotalNonCash,
            TotalTransactions = session.TotalTransactions,
            Status = "Closed",
            Notes = session.Notes
        });
    }

    /// <summary>
    /// List all sessions (Admin only)
    /// Filter menggunakan BusinessDate logic (WIB = UTC+7)
    /// </summary>
    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ListSessions(
        [FromQuery] DateTime? dateFrom = null,
        [FromQuery] DateTime? dateTo = null,
        [FromQuery] string? cashierId = null)
    {
        var query = _context.CashierSessions
            .Include(s => s.Cashier)
            .AsNoTracking()
            .AsQueryable();

        // Filter menggunakan WIB (UTC+7) agar konsisten dengan BusinessDate di transaksi
        if (dateFrom.HasValue)
        {
            var fromDateOnly = DateOnly.FromDateTime(dateFrom.Value);
            query = query.Where(s => DateOnly.FromDateTime(s.StartTime.AddHours(7)) >= fromDateOnly);
        }
        if (dateTo.HasValue)
        {
            var toDateOnly = DateOnly.FromDateTime(dateTo.Value);
            query = query.Where(s => DateOnly.FromDateTime(s.StartTime.AddHours(7)) <= toDateOnly);
        }
        if (!string.IsNullOrEmpty(cashierId) && Guid.TryParse(cashierId, out var cid))
            query = query.Where(s => s.CashierId == cid);

        var sessions = await query
            .OrderByDescending(s => s.StartTime)
            .Take(100)
            .ToListAsync();

        return Ok(sessions.Select(s => new CashierSessionResponse
        {
            Id = s.Id.ToString(),
            CashierId = s.CashierId.ToString(),
            CashierName = s.Cashier?.Name ?? "Unknown",
            StartTime = s.StartTime,
            EndTime = s.EndTime,
            OpeningCash = s.OpeningCash,
            ClosingCash = s.ClosingCash,
            ExpectedCash = s.ExpectedCash,
            Difference = s.Difference,
            TotalSales = s.TotalSales,
            TotalCash = s.TotalCash,
            TotalNonCash = s.TotalNonCash,
            TotalTransactions = s.TotalTransactions,
            Status = s.Status.ToString(),
            Notes = s.Notes
        }));
    }

    /// <summary>
    /// Get session detail by ID (Admin only)
    /// </summary>
    [HttpGet("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetSession(string id)
    {
        if (!Guid.TryParse(id, out var sessionId))
            return BadRequest(new { message = "Invalid ID" });

        var session = await _context.CashierSessions
            .Include(s => s.Cashier)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session == null)
            return NotFound();

        return Ok(new CashierSessionResponse
        {
            Id = session.Id.ToString(),
            CashierId = session.CashierId.ToString(),
            CashierName = session.Cashier?.Name ?? "Unknown",
            StartTime = session.StartTime,
            EndTime = session.EndTime,
            OpeningCash = session.OpeningCash,
            ClosingCash = session.ClosingCash,
            ExpectedCash = session.ExpectedCash,
            Difference = session.Difference,
            TotalSales = session.TotalSales,
            TotalCash = session.TotalCash,
            TotalNonCash = session.TotalNonCash,
            TotalTransactions = session.TotalTransactions,
            Status = session.Status.ToString(),
            Notes = session.Notes
        });
    }
}
