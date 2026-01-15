using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WarungKopiAPI.Data;
using WarungKopiAPI.Models;

namespace WarungKopiAPI.Controllers;

[ApiController]
[Route("api/settings")]
[Authorize(Roles = "Admin")]
public class SettingsController : ControllerBase
{
    private readonly WarungKopiDbContext _context;

    // Default settings
    private static readonly Dictionary<string, (string Value, string Description)> DefaultSettings = new()
    {
        { "store_name", ("Kasirdotnet", "Nama toko") },
        { "store_address", ("", "Alamat toko") },
        { "store_phone", ("", "Nomor telepon toko") },
        { "tax_mode", ("default", "Mode pajak: default atau custom") },
        { "default_tax", ("11", "Pajak default (%) - PPN Indonesia") },
        { "custom_tax", ("11", "Pajak custom (%)") },
        { "payment_cash_enabled", ("true", "Metode pembayaran Cash aktif") },
        { "payment_qris_enabled", ("true", "Metode pembayaran QRIS aktif") },
        { "opening_hour", ("08:00", "Jam buka") },
        { "closing_hour", ("22:00", "Jam tutup") },
        { "receipt_footer", ("Terima kasih atas kunjungan Anda!", "Footer struk") },
        { "low_stock_threshold", ("5", "Batas stok menipis") }
    };

    public SettingsController(WarungKopiDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Get all settings
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll()
    {
        var settings = await _context.StoreSettings.AsNoTracking().ToListAsync();
        
        // Merge with defaults
        var result = new Dictionary<string, object>();
        foreach (var (key, (defaultValue, description)) in DefaultSettings)
        {
            var setting = settings.FirstOrDefault(s => s.Key == key);
            result[key] = new
            {
                value = setting?.Value ?? defaultValue,
                description
            };
        }

        // Add any custom settings not in defaults
        foreach (var setting in settings.Where(s => !DefaultSettings.ContainsKey(s.Key)))
        {
            result[setting.Key] = new
            {
                value = setting.Value,
                description = setting.Description ?? ""
            };
        }

        return Ok(result);
    }

    /// <summary>
    /// Get single setting
    /// </summary>
    [HttpGet("{key}")]
    [AllowAnonymous]
    public async Task<IActionResult> Get(string key)
    {
        var setting = await _context.StoreSettings.FirstOrDefaultAsync(s => s.Key == key);
        
        if (setting != null)
            return Ok(new { key = setting.Key, value = setting.Value });

        if (DefaultSettings.TryGetValue(key, out var defaultSetting))
            return Ok(new { key, value = defaultSetting.Value });

        return NotFound(new { message = "Setting not found" });
    }

    /// <summary>
    /// Update settings (batch)
    /// </summary>
    [HttpPut]
    public async Task<IActionResult> UpdateBatch([FromBody] Dictionary<string, string> updates)
    {
        foreach (var (key, value) in updates)
        {
            var setting = await _context.StoreSettings.FirstOrDefaultAsync(s => s.Key == key);
            
            if (setting != null)
            {
                setting.Value = value;
                setting.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                var description = DefaultSettings.TryGetValue(key, out var def) ? def.Description : null;
                _context.StoreSettings.Add(new StoreSetting
                {
                    Id = Guid.NewGuid(),
                    Key = key,
                    Value = value,
                    Description = description,
                    UpdatedAt = DateTime.UtcNow
                });
            }
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Settings updated" });
    }

    /// <summary>
    /// Update single setting
    /// </summary>
    [HttpPut("{key}")]
    public async Task<IActionResult> Update(string key, [FromBody] UpdateSettingRequest request)
    {
        var setting = await _context.StoreSettings.FirstOrDefaultAsync(s => s.Key == key);
        
        if (setting != null)
        {
            setting.Value = request.Value;
            setting.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            var description = DefaultSettings.TryGetValue(key, out var def) ? def.Description : null;
            _context.StoreSettings.Add(new StoreSetting
            {
                Id = Guid.NewGuid(),
                Key = key,
                Value = request.Value,
                Description = description,
                UpdatedAt = DateTime.UtcNow
            });
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Setting updated", key, value = request.Value });
    }

    /// <summary>
    /// Reset data - hapus data transaksi/operasional, pertahankan master data
    /// </summary>
    [HttpPost("reset-data")]
    public async Task<IActionResult> ResetData([FromBody] ResetDataRequest request)
    {
        if (request.ConfirmCode != "RESET-DATA")
            return BadRequest(new { message = "Kode konfirmasi salah. Ketik 'RESET-DATA' untuk melanjutkan." });

        var result = new ResetDataResult();

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // 1. Hapus transaksi dan item transaksi
            if (request.ResetTransactions)
            {
                var transactionItems = await _context.TransactionItems.ToListAsync();
                _context.TransactionItems.RemoveRange(transactionItems);
                result.TransactionItemsDeleted = transactionItems.Count;

                var transactions = await _context.Transactions.ToListAsync();
                _context.Transactions.RemoveRange(transactions);
                result.TransactionsDeleted = transactions.Count;
            }

            // 2. Hapus sesi kasir
            if (request.ResetSessions)
            {
                var sessions = await _context.CashierSessions.ToListAsync();
                _context.CashierSessions.RemoveRange(sessions);
                result.SessionsDeleted = sessions.Count;
            }

            // 3. Hapus laporan harian
            if (request.ResetDailyReports)
            {
                var reports = await _context.DailyClosures.ToListAsync();
                _context.DailyClosures.RemoveRange(reports);
                result.DailyReportsDeleted = reports.Count;
            }

            // 4. Hapus riwayat stok
            if (request.ResetStockHistory)
            {
                var stockHistory = await _context.StockHistories.ToListAsync();
                _context.StockHistories.RemoveRange(stockHistory);
                result.StockHistoryDeleted = stockHistory.Count;
            }

            // 5. Reset stok produk ke 0
            if (request.ResetProductStock)
            {
                var products = await _context.Products.ToListAsync();
                foreach (var p in products)
                {
                    p.Stock = 0;
                    p.UpdatedAt = DateTime.UtcNow;
                }
                result.ProductsStockReset = products.Count;
            }

            // 6. Hapus riwayat kas
            if (request.ResetCashDrawer)
            {
                var cashHistory = await _context.CashDrawerHistories.ToListAsync();
                _context.CashDrawerHistories.RemoveRange(cashHistory);
                result.CashHistoryDeleted = cashHistory.Count;

                // Reset saldo kas ke 0
                var cashDrawer = await _context.CashDrawerBalances.FirstOrDefaultAsync();
                if (cashDrawer != null)
                {
                    cashDrawer.CurrentBalance = 0;
                    cashDrawer.LastUpdated = DateTime.UtcNow;
                }
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new { 
                message = "Data berhasil direset",
                result
            });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = "Gagal reset data", error = ex.Message });
        }
    }
}

public class UpdateSettingRequest
{
    public string Value { get; set; } = string.Empty;
}

public class ResetDataRequest
{
    public string ConfirmCode { get; set; } = string.Empty;
    public bool ResetTransactions { get; set; } = true;
    public bool ResetSessions { get; set; } = true;
    public bool ResetDailyReports { get; set; } = true;
    public bool ResetStockHistory { get; set; } = true;
    public bool ResetProductStock { get; set; } = true;
    public bool ResetCashDrawer { get; set; } = true;
}

public class ResetDataResult
{
    public int TransactionsDeleted { get; set; }
    public int TransactionItemsDeleted { get; set; }
    public int SessionsDeleted { get; set; }
    public int DailyReportsDeleted { get; set; }
    public int StockHistoryDeleted { get; set; }
    public int ProductsStockReset { get; set; }
    public int CashHistoryDeleted { get; set; }
}
