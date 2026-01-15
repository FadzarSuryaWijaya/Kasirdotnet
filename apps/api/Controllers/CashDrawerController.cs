using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using WarungKopiAPI.Data;
using WarungKopiAPI.DTOs;
using WarungKopiAPI.Models;

namespace WarungKopiAPI.Controllers;

[ApiController]
[Route("api/cash-drawer")]
[Authorize(Roles = "Admin")]
public class CashDrawerController : ControllerBase
{
    private readonly WarungKopiDbContext _context;

    public CashDrawerController(WarungKopiDbContext context)
    {
        _context = context;
    }

    private Guid GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(claim, out var id) ? id : Guid.Empty;
    }

    private string GetMovementLabel(CashMovementType type) => type switch
    {
        CashMovementType.SessionOpen => "Buka Shift",
        CashMovementType.SessionClose => "Tutup Shift",
        CashMovementType.SalesIn => "Penjualan Cash",
        CashMovementType.Adjustment => "Penyesuaian",
        CashMovementType.Withdrawal => "Pengambilan",
        CashMovementType.Deposit => "Setoran",
        _ => type.ToString()
    };

    private async Task<CashDrawerBalance> GetOrCreateBalance()
    {
        var balance = await _context.CashDrawerBalances.FirstOrDefaultAsync();
        if (balance == null)
        {
            balance = new CashDrawerBalance { Id = Guid.NewGuid(), CurrentBalance = 0 };
            _context.CashDrawerBalances.Add(balance);
            await _context.SaveChangesAsync();
        }
        return balance;
    }

    /// <summary>
    /// Get cash drawer summary
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetSummary()
    {
        var balance = await GetOrCreateBalance();
        var today = DateTime.UtcNow.Date;
        var tomorrow = today.AddDays(1);

        var todayHistory = await _context.CashDrawerHistories
            .Where(h => h.CreatedAt >= today && h.CreatedAt < tomorrow)
            .ToListAsync();

        var activeSessions = await _context.CashierSessions
            .CountAsync(s => s.Status == SessionStatus.Open);

        var summary = new CashDrawerSummaryResponse
        {
            CurrentBalance = balance.CurrentBalance,
            TodayCashIn = todayHistory
                .Where(h => h.MovementType == CashMovementType.SalesIn || 
                           h.MovementType == CashMovementType.Deposit ||
                           h.MovementType == CashMovementType.SessionOpen)
                .Sum(h => h.Amount),
            TodayCashOut = todayHistory
                .Where(h => h.MovementType == CashMovementType.Withdrawal)
                .Sum(h => Math.Abs(h.Amount)),
            TodayAdjustments = todayHistory
                .Where(h => h.MovementType == CashMovementType.Adjustment)
                .Sum(h => h.Amount),
            ActiveSessions = activeSessions,
            LastUpdated = balance.LastUpdated
        };

        return Ok(summary);
    }

    /// <summary>
    /// Get cash drawer history
    /// </summary>
    [HttpGet("history")]
    public async Task<IActionResult> GetHistory(
        [FromQuery] DateTime? dateFrom = null,
        [FromQuery] DateTime? dateTo = null,
        [FromQuery] int limit = 100)
    {
        var query = _context.CashDrawerHistories
            .AsNoTracking()
            .Include(h => h.User)
            .AsQueryable();

        if (dateFrom.HasValue)
            query = query.Where(h => h.CreatedAt >= dateFrom.Value);
        if (dateTo.HasValue)
            query = query.Where(h => h.CreatedAt <= dateTo.Value.AddDays(1));

        var history = await query
            .OrderByDescending(h => h.CreatedAt)
            .Take(limit)
            .Select(h => new CashDrawerHistoryResponse
            {
                Id = h.Id.ToString(),
                MovementType = h.MovementType.ToString(),
                MovementLabel = h.MovementType == CashMovementType.SessionOpen ? "Buka Shift" :
                               h.MovementType == CashMovementType.SessionClose ? "Tutup Shift" :
                               h.MovementType == CashMovementType.SalesIn ? "Penjualan Cash" :
                               h.MovementType == CashMovementType.Adjustment ? "Penyesuaian" :
                               h.MovementType == CashMovementType.Withdrawal ? "Pengambilan" :
                               h.MovementType == CashMovementType.Deposit ? "Setoran" : h.MovementType.ToString(),
                Amount = h.Amount,
                BalanceBefore = h.BalanceBefore,
                BalanceAfter = h.BalanceAfter,
                Reference = h.Reference,
                Notes = h.Notes,
                UserName = h.User != null ? h.User.Name : null,
                CreatedAt = h.CreatedAt
            })
            .ToListAsync();

        return Ok(history);
    }

    /// <summary>
    /// Adjust cash drawer balance (correction)
    /// </summary>
    [HttpPost("adjust")]
    public async Task<IActionResult> AdjustBalance([FromBody] CashAdjustmentRequest request)
    {
        if (request.Amount == 0)
            return BadRequest(new { message = "Amount tidak boleh 0" });

        if (string.IsNullOrWhiteSpace(request.Notes))
            return BadRequest(new { message = "Catatan wajib diisi" });

        var balance = await GetOrCreateBalance();
        var balanceBefore = balance.CurrentBalance;
        balance.CurrentBalance += request.Amount;
        balance.LastUpdated = DateTime.UtcNow;

        var history = new CashDrawerHistory
        {
            Id = Guid.NewGuid(),
            MovementType = CashMovementType.Adjustment,
            Amount = request.Amount,
            BalanceBefore = balanceBefore,
            BalanceAfter = balance.CurrentBalance,
            Notes = request.Notes,
            UserId = GetUserId(),
            CreatedAt = DateTime.UtcNow
        };

        _context.CashDrawerHistories.Add(history);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Saldo berhasil disesuaikan", balance = balance.CurrentBalance });
    }

    /// <summary>
    /// Withdraw cash from drawer
    /// </summary>
    [HttpPost("withdraw")]
    public async Task<IActionResult> Withdraw([FromBody] CashWithdrawalRequest request)
    {
        if (request.Amount <= 0)
            return BadRequest(new { message = "Amount harus lebih dari 0" });

        if (string.IsNullOrWhiteSpace(request.Notes))
            return BadRequest(new { message = "Catatan wajib diisi" });

        var balance = await GetOrCreateBalance();
        
        if (balance.CurrentBalance < request.Amount)
            return BadRequest(new { message = "Saldo tidak mencukupi" });

        var balanceBefore = balance.CurrentBalance;
        balance.CurrentBalance -= request.Amount;
        balance.LastUpdated = DateTime.UtcNow;

        var history = new CashDrawerHistory
        {
            Id = Guid.NewGuid(),
            MovementType = CashMovementType.Withdrawal,
            Amount = -request.Amount,
            BalanceBefore = balanceBefore,
            BalanceAfter = balance.CurrentBalance,
            Notes = request.Notes,
            UserId = GetUserId(),
            CreatedAt = DateTime.UtcNow
        };

        _context.CashDrawerHistories.Add(history);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Pengambilan kas berhasil", balance = balance.CurrentBalance });
    }

    /// <summary>
    /// Deposit cash to drawer
    /// </summary>
    [HttpPost("deposit")]
    public async Task<IActionResult> Deposit([FromBody] CashDepositRequest request)
    {
        if (request.Amount <= 0)
            return BadRequest(new { message = "Amount harus lebih dari 0" });

        if (string.IsNullOrWhiteSpace(request.Notes))
            return BadRequest(new { message = "Catatan wajib diisi" });

        var balance = await GetOrCreateBalance();
        var balanceBefore = balance.CurrentBalance;
        balance.CurrentBalance += request.Amount;
        balance.LastUpdated = DateTime.UtcNow;

        var history = new CashDrawerHistory
        {
            Id = Guid.NewGuid(),
            MovementType = CashMovementType.Deposit,
            Amount = request.Amount,
            BalanceBefore = balanceBefore,
            BalanceAfter = balance.CurrentBalance,
            Notes = request.Notes,
            UserId = GetUserId(),
            CreatedAt = DateTime.UtcNow
        };

        _context.CashDrawerHistories.Add(history);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Setoran kas berhasil", balance = balance.CurrentBalance });
    }

    /// <summary>
    /// Set initial balance (first time setup)
    /// </summary>
    [HttpPost("set-balance")]
    public async Task<IActionResult> SetBalance([FromBody] CashAdjustmentRequest request)
    {
        if (request.Amount < 0)
            return BadRequest(new { message = "Saldo tidak boleh negatif" });

        var balance = await GetOrCreateBalance();
        var balanceBefore = balance.CurrentBalance;
        var diff = request.Amount - balanceBefore;
        balance.CurrentBalance = request.Amount;
        balance.LastUpdated = DateTime.UtcNow;

        var history = new CashDrawerHistory
        {
            Id = Guid.NewGuid(),
            MovementType = CashMovementType.Adjustment,
            Amount = diff,
            BalanceBefore = balanceBefore,
            BalanceAfter = balance.CurrentBalance,
            Notes = request.Notes ?? "Set saldo awal",
            UserId = GetUserId(),
            CreatedAt = DateTime.UtcNow
        };

        _context.CashDrawerHistories.Add(history);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Saldo berhasil diset", balance = balance.CurrentBalance });
    }
}
