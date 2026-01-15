namespace WarungKopiAPI.DTOs;

public class CashDrawerSummaryResponse
{
    public decimal CurrentBalance { get; set; }
    public decimal TodayCashIn { get; set; }
    public decimal TodayCashOut { get; set; }
    public decimal TodayAdjustments { get; set; }
    public int ActiveSessions { get; set; }
    public DateTime LastUpdated { get; set; }
}

public class CashDrawerHistoryResponse
{
    public string Id { get; set; } = string.Empty;
    public string MovementType { get; set; } = string.Empty;
    public string MovementLabel { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public decimal BalanceBefore { get; set; }
    public decimal BalanceAfter { get; set; }
    public string? Reference { get; set; }
    public string? Notes { get; set; }
    public string? UserName { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CashAdjustmentRequest
{
    public decimal Amount { get; set; }
    public string Notes { get; set; } = string.Empty;
}

public class CashWithdrawalRequest
{
    public decimal Amount { get; set; }
    public string Notes { get; set; } = string.Empty;
}

public class CashDepositRequest
{
    public decimal Amount { get; set; }
    public string Notes { get; set; } = string.Empty;
}
