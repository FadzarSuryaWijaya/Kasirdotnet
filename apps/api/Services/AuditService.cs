using WarungKopiAPI.Data;
using WarungKopiAPI.Models;

namespace WarungKopiAPI.Services;

public class AuditService
{
    private readonly WarungKopiDbContext _context;

    public AuditService(WarungKopiDbContext context)
    {
        _context = context;
    }

    public async Task LogAsync(
        AuditAction action,
        Guid? userId,
        string? entityType = null,
        string? entityId = null,
        string? description = null,
        string? oldValue = null,
        string? newValue = null,
        string? ipAddress = null)
    {
        var log = new AuditLog
        {
            Id = Guid.NewGuid(),
            Action = action,
            ActionName = GetActionName(action),
            EntityType = entityType,
            EntityId = entityId,
            Description = description,
            OldValue = oldValue,
            NewValue = newValue,
            UserId = userId,
            IpAddress = ipAddress,
            CreatedAt = DateTime.UtcNow
        };

        _context.AuditLogs.Add(log);
        await _context.SaveChangesAsync();
    }

    private string GetActionName(AuditAction action) => action switch
    {
        AuditAction.UserCreated => "User Dibuat",
        AuditAction.UserUpdated => "User Diupdate",
        AuditAction.UserDeleted => "User Dihapus",
        AuditAction.PasswordReset => "Password Direset",
        AuditAction.UserLogin => "Login",
        AuditAction.UserLogout => "Logout",
        AuditAction.TransactionCreated => "Transaksi Dibuat",
        AuditAction.TransactionVoided => "Transaksi Void",
        AuditAction.StockRestock => "Restok Barang",
        AuditAction.StockAdjust => "Penyesuaian Stok",
        AuditAction.StockSet => "Set Stok",
        AuditAction.CashDeposit => "Setoran Kas",
        AuditAction.CashWithdraw => "Pengambilan Kas",
        AuditAction.CashAdjust => "Penyesuaian Kas",
        AuditAction.CashSet => "Set Saldo Kas",
        AuditAction.SessionStart => "Mulai Shift",
        AuditAction.SessionEnd => "Akhiri Shift",
        AuditAction.DayClosed => "Tutup Hari",
        AuditAction.DayReopened => "Buka Kembali Hari",
        AuditAction.ProductCreated => "Produk Dibuat",
        AuditAction.ProductUpdated => "Produk Diupdate",
        AuditAction.ProductDeleted => "Produk Dihapus",
        AuditAction.CategoryCreated => "Kategori Dibuat",
        AuditAction.CategoryUpdated => "Kategori Diupdate",
        AuditAction.CategoryDeleted => "Kategori Dihapus",
        _ => action.ToString()
    };
}
