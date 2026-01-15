namespace WarungKopiAPI.Models;

public enum CashMovementType
{
    SessionOpen = 0,    // Saldo awal shift
    SessionClose = 1,   // Penutupan shift
    SalesIn = 2,        // Penjualan cash masuk
    Adjustment = 3,     // Penyesuaian manual
    Withdrawal = 4,     // Pengambilan kas
    Deposit = 5         // Setoran kas
}

public class CashDrawerHistory
{
    public Guid Id { get; set; }
    public CashMovementType MovementType { get; set; }
    public decimal Amount { get; set; }
    public decimal BalanceBefore { get; set; }
    public decimal BalanceAfter { get; set; }
    public string? Reference { get; set; } // Session ID, Invoice No, etc
    public string? Notes { get; set; }
    public Guid? UserId { get; set; }
    public User? User { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class CashDrawerBalance
{
    public Guid Id { get; set; }
    public decimal CurrentBalance { get; set; } = 0;
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
}
