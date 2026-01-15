namespace WarungKopiAPI.DTOs;

public class TransactionItemDto
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int Qty { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
}

public class TransactionResponse
{
    public Guid Id { get; set; }
    public Guid CashierId { get; set; }
    public string InvoiceNo { get; set; } = string.Empty;
    public string CashierName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string BusinessDate { get; set; } = string.Empty; // YYYY-MM-DD format
    public decimal Subtotal { get; set; }
    public decimal Discount { get; set; }
    public decimal Tax { get; set; }
    public decimal Total { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public decimal PaidAmount { get; set; }
    public decimal ChangeAmount { get; set; }
    public string? Notes { get; set; }
    public string Status { get; set; } = "Completed";
    public DateTime? VoidedAt { get; set; }
    public string? VoidedByName { get; set; }
    public string? VoidReason { get; set; }
    public List<TransactionItemDto> Items { get; set; } = new();
}

public class TransactionListItemResponse
{
    public Guid Id { get; set; }
    public string InvoiceNo { get; set; } = string.Empty;
    public string CashierName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string BusinessDate { get; set; } = string.Empty; // YYYY-MM-DD format for filtering
    public decimal Total { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public int ItemCount { get; set; }
    public string Status { get; set; } = "Completed";
}

public class VoidTransactionRequest
{
    public string Reason { get; set; } = string.Empty;
}

public class VoidedTransactionResponse
{
    public string Id { get; set; } = string.Empty;
    public string InvoiceNo { get; set; } = string.Empty;
    public string CashierName { get; set; } = string.Empty;
    public decimal Total { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? VoidedAt { get; set; }
    public string? VoidedByName { get; set; }
    public string? VoidReason { get; set; }
}
