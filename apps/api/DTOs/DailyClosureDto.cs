namespace WarungKopiAPI.DTOs;

public class CloseDayRequest
{
    public DateTime Date { get; set; }
    public decimal PhysicalCashCount { get; set; }
    public string? Notes { get; set; }
}

public class DailyClosureResponse
{
    public string Id { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public string ClosedByName { get; set; } = string.Empty;
    public DateTime ClosedAt { get; set; }
    
    public decimal SystemCashTotal { get; set; }
    public decimal SystemQrisTotal { get; set; }
    public decimal SystemTotalSales { get; set; }
    public int TotalTransactions { get; set; }
    
    public decimal PhysicalCashCount { get; set; }
    public decimal CashDifference { get; set; }
    
    public DateTime? OpenedAt { get; set; }
    public DateTime? LastTransactionAt { get; set; }
    
    public string? Notes { get; set; }
}

public class ClosureStatusResponse
{
    public bool IsClosed { get; set; }
    public DailyClosureResponse? Closure { get; set; }
    
    // Pre-closure summary (for showing before closing)
    public decimal SystemCashTotal { get; set; }
    public decimal SystemQrisTotal { get; set; }
    public decimal SystemTotalSales { get; set; }
    public int TotalTransactions { get; set; }
    public DateTime? FirstTransactionAt { get; set; }
    public DateTime? LastTransactionAt { get; set; }
    
    // Open sessions that need to be closed first
    public List<OpenSessionInfo> OpenSessions { get; set; } = new();
}

public class OpenSessionInfo
{
    public string SessionId { get; set; } = string.Empty;
    public string CashierName { get; set; } = string.Empty;
    public DateTime StartTime { get; set; }
}
