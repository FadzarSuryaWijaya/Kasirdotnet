namespace WarungKopiAPI.Models;

public class DailyClosure
{
    public Guid Id { get; set; }
    public DateTime Date { get; set; } // The date being closed (date only, no time)
    public Guid ClosedById { get; set; }
    public User ClosedBy { get; set; } = null!;
    public DateTime ClosedAt { get; set; } = DateTime.UtcNow;
    
    // System calculated totals (snapshot at closure time)
    public decimal SystemCashTotal { get; set; }
    public decimal SystemQrisTotal { get; set; }
    public decimal SystemTotalSales { get; set; }
    public int TotalTransactions { get; set; }
    
    // Physical cash count entered by cashier
    public decimal PhysicalCashCount { get; set; }
    public decimal CashDifference { get; set; } // Physical - System (positive = over, negative = short)
    
    // Shift info
    public DateTime? OpenedAt { get; set; } // First transaction time
    public DateTime? LastTransactionAt { get; set; } // Last transaction time
    
    public string? Notes { get; set; }
}
