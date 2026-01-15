namespace WarungKopiAPI.DTOs;

public class StartSessionRequest
{
    public decimal OpeningCash { get; set; }
}

public class EndSessionRequest
{
    public decimal ClosingCash { get; set; }
    public string? Notes { get; set; }
}

public class CashierSessionResponse
{
    public string Id { get; set; } = string.Empty;
    public string CashierId { get; set; } = string.Empty;
    public string CashierName { get; set; } = string.Empty;
    
    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    
    public decimal OpeningCash { get; set; }
    public decimal ClosingCash { get; set; }
    public decimal ExpectedCash { get; set; }
    public decimal Difference { get; set; }
    
    public decimal TotalSales { get; set; }
    public decimal TotalCash { get; set; }
    public decimal TotalNonCash { get; set; }
    public int TotalTransactions { get; set; }
    
    public string Status { get; set; } = string.Empty; // "Open" or "Closed"
    public string? Notes { get; set; }
}

public class ActiveSessionResponse
{
    public bool HasActiveSession { get; set; }
    public CashierSessionResponse? Session { get; set; }
}
