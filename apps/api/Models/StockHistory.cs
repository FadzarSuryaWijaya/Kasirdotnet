namespace WarungKopiAPI.Models;

public enum StockMovementType
{
    In = 0,      // Restok / barang masuk
    Out = 1,     // Penjualan / barang keluar
    Adjust = 2   // Penyesuaian (koreksi stok)
}

public class StockHistory
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;
    
    public StockMovementType MovementType { get; set; }
    public int Quantity { get; set; } // Positive for IN, negative for OUT
    public int StockBefore { get; set; }
    public int StockAfter { get; set; }
    
    public string? Reference { get; set; } // Invoice number for sales, or note for restock
    public string? Notes { get; set; }
    
    public Guid? UserId { get; set; } // Who made this change
    public User? User { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
