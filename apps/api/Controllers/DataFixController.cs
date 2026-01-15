using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WarungKopiAPI.Data;

namespace WarungKopiAPI.Controllers;

/// <summary>
/// Controller untuk memperbaiki data yang tidak konsisten
/// </summary>
[ApiController]
[Route("api/data-fix")]
[Authorize(Roles = "Admin")]
public class DataFixController : ControllerBase
{
    private readonly WarungKopiDbContext _context;

    public DataFixController(WarungKopiDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Fix BusinessDate untuk transaksi yang belum punya BusinessDate (default 0001-01-01)
    /// BusinessDate dihitung dari CreatedAt + 7 jam (WIB)
    /// </summary>
    [HttpPost("fix-business-dates")]
    public async Task<IActionResult> FixBusinessDates()
    {
        try
        {
            // Cari transaksi dengan BusinessDate default (0001-01-01)
            var defaultDate = DateOnly.MinValue;
            var transactionsToFix = await _context.Transactions
                .Where(t => t.BusinessDate == defaultDate)
                .ToListAsync();

            if (transactionsToFix.Count == 0)
            {
                return Ok(new { message = "Tidak ada transaksi yang perlu diperbaiki", fixedCount = 0 });
            }

            foreach (var tx in transactionsToFix)
            {
                // Hitung BusinessDate dari CreatedAt (UTC) + 7 jam (WIB)
                var wibTime = tx.CreatedAt.AddHours(7);
                tx.BusinessDate = DateOnly.FromDateTime(wibTime);
            }

            await _context.SaveChangesAsync();

            var result = transactionsToFix.Select(t => new 
            {
                t.InvoiceNo,
                CreatedAt = t.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss"),
                BusinessDate = t.BusinessDate.ToString("yyyy-MM-dd")
            }).ToList();

            return Ok(new 
            { 
                message = "Berhasil memperbaiki transaksi",
                fixedCount = transactionsToFix.Count,
                transactions = result
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    /// <summary>
    /// Cek status data - apakah ada transaksi dengan BusinessDate kosong
    /// </summary>
    [HttpGet("check-data")]
    public async Task<IActionResult> CheckData()
    {
        try
        {
            var defaultDate = DateOnly.MinValue;
            
            var totalTransactions = await _context.Transactions.CountAsync();
            var transactionsWithoutBusinessDate = await _context.Transactions
                .Where(t => t.BusinessDate == defaultDate)
                .CountAsync();

            var totalSessions = await _context.CashierSessions.CountAsync();
            
            // Cek transaksi hari ini (WIB)
            var todayWIB = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));
            var todayTransactions = await _context.Transactions
                .Where(t => t.BusinessDate == todayWIB)
                .CountAsync();

            // Cek session hari ini
            var todaySessions = await _context.CashierSessions
                .Where(s => DateOnly.FromDateTime(s.StartTime.AddHours(7)) == todayWIB)
                .CountAsync();

            return Ok(new 
            {
                totalTransactions,
                transactionsWithoutBusinessDate,
                needsFix = transactionsWithoutBusinessDate > 0,
                totalSessions,
                todayWIB = todayWIB.ToString("yyyy-MM-dd"),
                todayTransactions,
                todaySessions
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }
}
