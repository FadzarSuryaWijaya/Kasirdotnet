namespace WarungKopiAPI.Models;

/// <summary>
/// Immutable snapshot of transaction data at the moment of completion.
/// Used for PDF generation and audit trail. Never modified after creation.
/// </summary>
public class TransactionSnapshot
{
    public Guid Id { get; set; }
    public Guid TransactionId { get; set; }
    public Transaction Transaction { get; set; } = null!;
    
    // Store & Cashier Info
    public Guid StoreId { get; set; }
    public string StoreName { get; set; } = string.Empty;
    public string StoreAddress { get; set; } = string.Empty;
    public Guid CashierId { get; set; }
    public string CashierName { get; set; } = string.Empty;
    
    // Transaction Details
    public string InvoiceNo { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
    
    // Totals (snapshot values - immutable)
    public decimal Subtotal { get; set; }
    public decimal Discount { get; set; }
    public decimal Tax { get; set; }
    public decimal Total { get; set; }
    
    // Payment Info
    public string PaymentMethod { get; set; } = string.Empty;
    public decimal PaidAmount { get; set; }
    public decimal ChangeAmount { get; set; }
    public string? Notes { get; set; }
    
    // Items (serialized JSON for immutability)
    public string ItemsJson { get; set; } = "[]";
    
    // PDF Generation Tracking
    public int PdfGenerationCount { get; set; } = 0;
    public DateTime? LastPdfGeneratedAtUtc { get; set; }
    public string? LastPdfErrorMessage { get; set; }
    
    // Metadata
    public DateTime SnapshotCreatedAtUtc { get; set; } = DateTime.UtcNow;
    public bool IsImmutable { get; set; } = true;
}

/// <summary>
/// Item snapshot for JSON serialization
/// </summary>
public class TransactionSnapshotItem
{
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int Qty { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
}
