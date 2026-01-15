namespace WarungKopiAPI.DTOs;

public class DailyReportResponse
{
    public string Date { get; set; } = string.Empty;
    public decimal TotalSales { get; set; }
    public int TotalTransactions { get; set; }
    public int TotalItemsSold { get; set; }
    public int TotalQty { get; set; }
    public decimal TotalDiscount { get; set; }
    public decimal TotalTax { get; set; }
    public List<PaymentMethodSummary> ByPaymentMethod { get; set; } = new();
    public List<ProductSoldSummary> TopProducts { get; set; } = new();
    public List<HourlySalesSummary> HourlySales { get; set; } = new();
    public List<TransactionSummary> Transactions { get; set; } = new();
    
    // Closure status
    public bool IsClosed { get; set; }
    public DailyClosureInfo? Closure { get; set; }
    
    // Comparison with previous day
    public decimal? PreviousDaySales { get; set; }
    public decimal? SalesChange { get; set; } // percentage change
}

public class DailyClosureInfo
{
    public string ClosedByName { get; set; } = string.Empty;
    public DateTime ClosedAt { get; set; }
    public decimal PhysicalCashCount { get; set; }
    public decimal CashDifference { get; set; }
    public string? Notes { get; set; }
}

public class PaymentMethodSummary
{
    public string Method { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public int Count { get; set; }
}

public class ProductSoldSummary
{
    public string ProductId { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public int QtySold { get; set; }
    public decimal TotalSales { get; set; }
}

public class HourlySalesSummary
{
    public int Hour { get; set; }
    public decimal Amount { get; set; }
    public int Count { get; set; }
}

public class TransactionSummary
{
    public string Id { get; set; } = string.Empty;
    public string InvoiceNo { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public decimal Total { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public string CashierName { get; set; } = string.Empty;
    public int ItemCount { get; set; }
}
