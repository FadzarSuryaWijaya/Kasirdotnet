using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WarungKopiAPI.Data;
using WarungKopiAPI.DTOs;
using WarungKopiAPI.Models;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace WarungKopiAPI.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize(Roles = "Admin")]
public class ReportsController : ControllerBase
{
    private readonly WarungKopiDbContext _context;

    public ReportsController(WarungKopiDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Get summary report for dashboard - today, month, year
    /// </summary>
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        try
        {
            var now = DateTime.UtcNow.AddHours(7); // WIB
            var today = DateOnly.FromDateTime(now);
            var yesterday = today.AddDays(-1);
            var firstDayOfMonth = new DateOnly(today.Year, today.Month, 1);
            var firstDayOfLastMonth = firstDayOfMonth.AddMonths(-1);
            var lastDayOfLastMonth = firstDayOfMonth.AddDays(-1);
            var firstDayOfYear = new DateOnly(today.Year, 1, 1);

            // Today's transactions
            var todayTx = await _context.Transactions
                .AsNoTracking()
                .Where(t => t.BusinessDate == today && t.Status == TransactionStatus.Completed)
                .ToListAsync();

            var todaySales = todayTx.Sum(t => t.Total);
            var todayCash = todayTx.Where(t => t.PaymentMethod == "Cash").Sum(t => t.Total);
            var todayQris = todayTx.Where(t => t.PaymentMethod == "QRIS").Sum(t => t.Total);

            // Yesterday
            var yesterdaySales = await _context.Transactions
                .AsNoTracking()
                .Where(t => t.BusinessDate == yesterday && t.Status == TransactionStatus.Completed)
                .SumAsync(t => t.Total);

            // This month
            var monthTx = await _context.Transactions
                .AsNoTracking()
                .Where(t => t.BusinessDate >= firstDayOfMonth && t.BusinessDate <= today && t.Status == TransactionStatus.Completed)
                .ToListAsync();

            // Last month
            var lastMonthSales = await _context.Transactions
                .AsNoTracking()
                .Where(t => t.BusinessDate >= firstDayOfLastMonth && t.BusinessDate <= lastDayOfLastMonth && t.Status == TransactionStatus.Completed)
                .SumAsync(t => t.Total);

            // This year
            var yearTx = await _context.Transactions
                .AsNoTracking()
                .Where(t => t.BusinessDate >= firstDayOfYear && t.BusinessDate <= today && t.Status == TransactionStatus.Completed)
                .ToListAsync();

            // Active sessions
            var activeSessions = await _context.CashierSessions
                .CountAsync(s => s.Status == SessionStatus.Open);

            var todaySessions = await _context.CashierSessions
                .CountAsync(s => DateOnly.FromDateTime(s.StartTime.AddHours(7)) == today);

            // Monthly sales for chart (last 6 months)
            var monthlySales = new List<object>();
            for (int i = 5; i >= 0; i--)
            {
                var monthStart = new DateOnly(now.Year, now.Month, 1).AddMonths(-i);
                var monthEnd = monthStart.AddMonths(1).AddDays(-1);
                
                var sales = await _context.Transactions
                    .AsNoTracking()
                    .Where(t => t.BusinessDate >= monthStart && t.BusinessDate <= monthEnd && t.Status == TransactionStatus.Completed)
                    .SumAsync(t => t.Total);

                var txCount = await _context.Transactions
                    .AsNoTracking()
                    .Where(t => t.BusinessDate >= monthStart && t.BusinessDate <= monthEnd && t.Status == TransactionStatus.Completed)
                    .CountAsync();

                monthlySales.Add(new
                {
                    month = monthStart.ToString("MMM"),
                    sales,
                    transactions = txCount
                });
            }

            return Ok(new
            {
                summary = new
                {
                    todaySales,
                    todayTransactions = todayTx.Count,
                    todayCash,
                    todayQris,
                    monthSales = monthTx.Sum(t => t.Total),
                    monthTransactions = monthTx.Count,
                    yearSales = yearTx.Sum(t => t.Total),
                    yearTransactions = yearTx.Count,
                    activeSessions,
                    todaySessions,
                    yesterdaySales,
                    lastMonthSales
                },
                monthlySales
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpGet("daily")]
    public async Task<IActionResult> GetDailyReport([FromQuery] DateTime? date = null)
    {
        try
        {
            var reportDate = date?.Date ?? DateTime.Now.Date;
            var businessDate = DateOnly.FromDateTime(reportDate);

            var transactions = await _context.Transactions
                .AsNoTracking()
                .Include(t => t.Cashier)
                .Include(t => t.Items).ThenInclude(i => i.Product)
                .Where(t => t.BusinessDate == businessDate && t.Status == TransactionStatus.Completed)
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();

            var totalSales = transactions.Sum(t => t.Total);
            var totalTransactions = transactions.Count;
            var totalDiscount = transactions.Sum(t => t.Discount);
            var totalTax = transactions.Sum(t => t.Tax);

            var allItems = transactions.SelectMany(t => t.Items).ToList();
            var totalItemsSold = allItems.Count;
            var totalQty = allItems.Sum(i => i.Qty);

            var byPaymentMethod = transactions
                .GroupBy(t => t.PaymentMethod)
                .Select(g => new PaymentMethodSummary { Method = g.Key, Amount = g.Sum(t => t.Total), Count = g.Count() })
                .OrderBy(x => x.Method).ToList();

            var topProducts = allItems
                .GroupBy(i => new { i.ProductId, i.Product.Name })
                .Select(g => new ProductSoldSummary { ProductId = g.Key.ProductId.ToString(), ProductName = g.Key.Name, QtySold = g.Sum(i => i.Qty), TotalSales = g.Sum(i => i.LineTotal) })
                .OrderByDescending(p => p.QtySold).Take(10).ToList();

            var hourlySales = transactions
                .GroupBy(t => t.CreatedAt.Hour)
                .Select(g => new HourlySalesSummary { Hour = g.Key, Amount = g.Sum(t => t.Total), Count = g.Count() })
                .OrderBy(h => h.Hour).ToList();

            var transactionList = transactions.Select(t => new TransactionSummary
            {
                Id = t.Id.ToString(), InvoiceNo = t.InvoiceNo, CreatedAt = t.CreatedAt,
                Total = t.Total, PaymentMethod = t.PaymentMethod,
                CashierName = t.Cashier?.Name ?? "Unknown", ItemCount = t.Items.Count
            }).ToList();

            // Check closure status
            var closure = await _context.DailyClosures
                .AsNoTracking()
                .Include(c => c.ClosedBy)
                .FirstOrDefaultAsync(c => DateOnly.FromDateTime(c.Date) == businessDate);

            // Get previous day sales for comparison
            var previousBusinessDate = businessDate.AddDays(-1);
            var previousDaySales = await _context.Transactions
                .AsNoTracking()
                .Where(t => t.BusinessDate == previousBusinessDate && t.Status == TransactionStatus.Completed)
                .SumAsync(t => t.Total);

            decimal? salesChange = null;
            if (previousDaySales > 0)
                salesChange = ((totalSales - previousDaySales) / previousDaySales) * 100;

            var report = new DailyReportResponse
            {
                Date = reportDate.ToString("yyyy-MM-dd"),
                TotalSales = totalSales,
                TotalTransactions = totalTransactions,
                TotalItemsSold = totalItemsSold,
                TotalQty = totalQty,
                TotalDiscount = totalDiscount,
                TotalTax = totalTax,
                ByPaymentMethod = byPaymentMethod,
                TopProducts = topProducts,
                HourlySales = hourlySales,
                Transactions = transactionList,
                IsClosed = closure != null,
                Closure = closure != null ? new DailyClosureInfo
                {
                    ClosedByName = closure.ClosedBy?.Name ?? "Unknown",
                    ClosedAt = closure.ClosedAt,
                    PhysicalCashCount = closure.PhysicalCashCount,
                    CashDifference = closure.CashDifference,
                    Notes = closure.Notes
                } : null,
                PreviousDaySales = previousDaySales > 0 ? previousDaySales : null,
                SalesChange = salesChange
            };

            return Ok(report);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpGet("closure-status")]
    public async Task<IActionResult> GetClosureStatus([FromQuery] DateTime? date = null)
    {
        try
        {
            var reportDate = date?.Date ?? DateTime.Now.Date;
            var businessDate = DateOnly.FromDateTime(reportDate);

            var transactions = await _context.Transactions
                .AsNoTracking()
                .Where(t => t.BusinessDate == businessDate && t.Status == TransactionStatus.Completed)
                .ToListAsync();

            var cashTotal = transactions.Where(t => t.PaymentMethod == "Cash").Sum(t => t.Total);
            var qrisTotal = transactions.Where(t => t.PaymentMethod == "QRIS").Sum(t => t.Total);
            var totalSales = transactions.Sum(t => t.Total);

            var closure = await _context.DailyClosures
                .AsNoTracking()
                .Include(c => c.ClosedBy)
                .FirstOrDefaultAsync(c => DateOnly.FromDateTime(c.Date) == businessDate);

            // Get open sessions for this date (using BusinessDate logic - WIB)
            var openSessions = await _context.CashierSessions
                .AsNoTracking()
                .Include(s => s.Cashier)
                .Where(s => DateOnly.FromDateTime(s.StartTime.AddHours(7)) == businessDate && s.Status == Models.SessionStatus.Open)
                .Select(s => new OpenSessionInfo
                {
                    SessionId = s.Id.ToString(),
                    CashierName = s.Cashier != null ? s.Cashier.Name : "Unknown",
                    StartTime = s.StartTime
                })
                .ToListAsync();

            return Ok(new ClosureStatusResponse
            {
                IsClosed = closure != null,
                Closure = closure != null ? new DailyClosureResponse
                {
                    Id = closure.Id.ToString(),
                    Date = closure.Date.ToString("yyyy-MM-dd"),
                    ClosedByName = closure.ClosedBy?.Name ?? "Unknown",
                    ClosedAt = closure.ClosedAt,
                    SystemCashTotal = closure.SystemCashTotal,
                    SystemQrisTotal = closure.SystemQrisTotal,
                    SystemTotalSales = closure.SystemTotalSales,
                    TotalTransactions = closure.TotalTransactions,
                    PhysicalCashCount = closure.PhysicalCashCount,
                    CashDifference = closure.CashDifference,
                    OpenedAt = closure.OpenedAt,
                    LastTransactionAt = closure.LastTransactionAt,
                    Notes = closure.Notes
                } : null,
                SystemCashTotal = cashTotal,
                SystemQrisTotal = qrisTotal,
                SystemTotalSales = totalSales,
                TotalTransactions = transactions.Count,
                FirstTransactionAt = transactions.OrderBy(t => t.CreatedAt).FirstOrDefault()?.CreatedAt,
                LastTransactionAt = transactions.OrderByDescending(t => t.CreatedAt).FirstOrDefault()?.CreatedAt,
                OpenSessions = openSessions
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpPost("close-day")]
    public async Task<IActionResult> CloseDay([FromBody] CloseDayRequest request)
    {
        try
        {
            var reportDate = request.Date.Date;
            var businessDate = DateOnly.FromDateTime(reportDate);

            // Check if already closed
            var existing = await _context.DailyClosures.FirstOrDefaultAsync(c => DateOnly.FromDateTime(c.Date) == businessDate);
            if (existing != null)
                return BadRequest(new { message = "Hari ini sudah ditutup" });

            // Check for open sessions on this date (using BusinessDate logic - WIB)
            var openSessions = await _context.CashierSessions
                .Include(s => s.Cashier)
                .Where(s => DateOnly.FromDateTime(s.StartTime.AddHours(7)) == businessDate && s.Status == Models.SessionStatus.Open)
                .ToListAsync();

            if (openSessions.Any())
            {
                var names = string.Join(", ", openSessions.Select(s => s.Cashier?.Name ?? "Unknown"));
                return BadRequest(new { message = $"Masih ada shift aktif: {names}. Semua shift harus ditutup sebelum tutup hari." });
            }

            // Get transactions for the day using BusinessDate
            var transactions = await _context.Transactions
                .Where(t => t.BusinessDate == businessDate && t.Status == TransactionStatus.Completed)
                .ToListAsync();

            var cashTotal = transactions.Where(t => t.PaymentMethod == "Cash").Sum(t => t.Total);
            var qrisTotal = transactions.Where(t => t.PaymentMethod == "QRIS").Sum(t => t.Total);

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
                return Unauthorized();

            var closure = new DailyClosure
            {
                Id = Guid.NewGuid(),
                Date = reportDate,
                ClosedById = userId,
                ClosedAt = DateTime.UtcNow,
                SystemCashTotal = cashTotal,
                SystemQrisTotal = qrisTotal,
                SystemTotalSales = cashTotal + qrisTotal,
                TotalTransactions = transactions.Count,
                PhysicalCashCount = request.PhysicalCashCount,
                CashDifference = request.PhysicalCashCount - cashTotal,
                OpenedAt = transactions.OrderBy(t => t.CreatedAt).FirstOrDefault()?.CreatedAt,
                LastTransactionAt = transactions.OrderByDescending(t => t.CreatedAt).FirstOrDefault()?.CreatedAt,
                Notes = request.Notes
            };

            _context.DailyClosures.Add(closure);

            // AUTO-DEPOSIT to Cash Drawer: Add daily cash sales to cash drawer
            if (cashTotal > 0)
            {
                var cashDrawerBalance = await _context.CashDrawerBalances.FirstOrDefaultAsync();
                if (cashDrawerBalance == null)
                {
                    cashDrawerBalance = new CashDrawerBalance { Id = Guid.NewGuid(), CurrentBalance = 0 };
                    _context.CashDrawerBalances.Add(cashDrawerBalance);
                    await _context.SaveChangesAsync();
                }

                var balanceBefore = cashDrawerBalance.CurrentBalance;
                cashDrawerBalance.CurrentBalance += cashTotal;
                cashDrawerBalance.LastUpdated = DateTime.UtcNow;

                var cashHistory = new CashDrawerHistory
                {
                    Id = Guid.NewGuid(),
                    MovementType = CashMovementType.SalesIn,
                    Amount = cashTotal,
                    BalanceBefore = balanceBefore,
                    BalanceAfter = cashDrawerBalance.CurrentBalance,
                    Reference = closure.Id.ToString(),
                    Notes = $"Penjualan Cash {businessDate:yyyy-MM-dd} ({transactions.Count(t => t.PaymentMethod == "Cash")} transaksi)",
                    UserId = userId,
                    CreatedAt = DateTime.UtcNow
                };
                _context.CashDrawerHistories.Add(cashHistory);
            }

            await _context.SaveChangesAsync();

            var user = await _context.Users.FindAsync(userId);

            return Ok(new DailyClosureResponse
            {
                Id = closure.Id.ToString(),
                Date = closure.Date.ToString("yyyy-MM-dd"),
                ClosedByName = user?.Name ?? "Unknown",
                ClosedAt = closure.ClosedAt,
                SystemCashTotal = closure.SystemCashTotal,
                SystemQrisTotal = closure.SystemQrisTotal,
                SystemTotalSales = closure.SystemTotalSales,
                TotalTransactions = closure.TotalTransactions,
                PhysicalCashCount = closure.PhysicalCashCount,
                CashDifference = closure.CashDifference,
                OpenedAt = closure.OpenedAt,
                LastTransactionAt = closure.LastTransactionAt,
                Notes = closure.Notes
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpDelete("closure/{id}")]
    public async Task<IActionResult> ReopenDay(string id)
    {
        try
        {
            if (!Guid.TryParse(id, out var closureId))
                return BadRequest(new { message = "Invalid ID" });

            var closure = await _context.DailyClosures.FindAsync(closureId);
            if (closure == null)
                return NotFound(new { message = "Closure not found" });

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            Guid.TryParse(userIdClaim, out var userId);

            // Reverse the cash drawer deposit if exists
            var cashHistory = await _context.CashDrawerHistories
                .FirstOrDefaultAsync(h => h.Reference == closureId.ToString() && h.MovementType == CashMovementType.SalesIn);
            
            if (cashHistory != null)
            {
                var cashDrawerBalance = await _context.CashDrawerBalances.FirstOrDefaultAsync();
                if (cashDrawerBalance != null)
                {
                    var balanceBefore = cashDrawerBalance.CurrentBalance;
                    cashDrawerBalance.CurrentBalance -= cashHistory.Amount;
                    cashDrawerBalance.LastUpdated = DateTime.UtcNow;

                    // Record reversal
                    var reversalHistory = new CashDrawerHistory
                    {
                        Id = Guid.NewGuid(),
                        MovementType = CashMovementType.Adjustment,
                        Amount = -cashHistory.Amount,
                        BalanceBefore = balanceBefore,
                        BalanceAfter = cashDrawerBalance.CurrentBalance,
                        Reference = closureId.ToString(),
                        Notes = $"Pembatalan tutup hari {DateOnly.FromDateTime(closure.Date):yyyy-MM-dd}",
                        UserId = userId,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.CashDrawerHistories.Add(reversalHistory);
                }
            }

            _context.DailyClosures.Remove(closure);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Hari berhasil dibuka kembali" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }
}
