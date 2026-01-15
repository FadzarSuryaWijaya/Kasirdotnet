namespace WarungKopiAPI.Models;

public enum SessionStatus
{
    Open = 0,
    Closed = 1
}

public class CashierSession
{
    public Guid Id { get; set; }
    public Guid CashierId { get; set; }
    public User Cashier { get; set; } = null!;
    
    public DateTime StartTime { get; set; } = DateTime.UtcNow;
    public DateTime? EndTime { get; set; }
    
    public decimal OpeningCash { get; set; } // Saldo awal kas
    public decimal ClosingCash { get; set; } // Uang fisik akhir (input kasir)
    public decimal ExpectedCash { get; set; } // Hitungan sistem (opening + cash sales)
    public decimal Difference { get; set; } // ClosingCash - ExpectedCash
    
    public decimal TotalSales { get; set; } // Total semua penjualan
    public decimal TotalCash { get; set; } // Total penjualan cash
    public decimal TotalNonCash { get; set; } // Total QRIS dll
    public int TotalTransactions { get; set; }
    
    public SessionStatus Status { get; set; } = SessionStatus.Open;
    public string? Notes { get; set; }
}
