namespace WarungKopiAPI.DTOs;

public class StockAdjustRequest
{
    public int Quantity { get; set; } // Positive for add, negative for subtract
    public string? Notes { get; set; }
}

public class RestockRequest
{
    public int Quantity { get; set; } // Must be positive
    public string? Notes { get; set; }
}

public class SetStockRequest
{
    public int NewStock { get; set; }
    public string? Notes { get; set; }
}

public class StockHistoryResponse
{
    public string Id { get; set; } = string.Empty;
    public string ProductId { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string MovementType { get; set; } = string.Empty; // In, Out, Adjust
    public int Quantity { get; set; }
    public int StockBefore { get; set; }
    public int StockAfter { get; set; }
    public string? Reference { get; set; }
    public string? Notes { get; set; }
    public string? UserName { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ProductStockResponse
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public int Stock { get; set; }
    public bool TrackStock { get; set; }
    public bool IsLowStock { get; set; } // Stock <= 5
    public bool IsOutOfStock { get; set; } // Stock <= 0
}

public class StockSummaryResponse
{
    public int TotalProducts { get; set; }
    public int LowStockCount { get; set; }
    public int OutOfStockCount { get; set; }
    public List<ProductStockResponse> Products { get; set; } = new();
}

public class ToggleTrackStockRequest
{
    public bool TrackStock { get; set; }
}
