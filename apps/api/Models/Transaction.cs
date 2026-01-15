namespace WarungKopiAPI.Models;

public enum TransactionStatus
{
    Completed = 0,
    Voided = 1,
    Refunded = 2
}

public class Transaction
{
    public Guid Id { get; set; }
    public string InvoiceNo { get; set; } = string.Empty;
    public Guid CashierId { get; set; }
    public User Cashier { get; set; } = null!;
    public Guid? SessionId { get; set; } // Link to CashierSession
    public CashierSession? Session { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateOnly BusinessDate { get; set; } // Business date for reporting (local date when transaction was made)
    public decimal Subtotal { get; set; }
    public decimal Discount { get; set; }
    public decimal Tax { get; set; }
    public decimal Total { get; set; }
    public string PaymentMethod { get; set; } = "Cash"; // Cash, QRIS
    public decimal PaidAmount { get; set; }
    public decimal ChangeAmount { get; set; }
    public string? Notes { get; set; }
    
    // Void/Refund fields
    public TransactionStatus Status { get; set; } = TransactionStatus.Completed;
    public DateTime? VoidedAt { get; set; }
    public Guid? VoidedById { get; set; }
    public User? VoidedBy { get; set; }
    public string? VoidReason { get; set; }
    
    public ICollection<TransactionItem> Items { get; set; } = new List<TransactionItem>();
}
