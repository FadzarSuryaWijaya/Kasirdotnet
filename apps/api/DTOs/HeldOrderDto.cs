namespace WarungKopiAPI.DTOs;

/// <summary>
/// Cart item stored in held order
/// </summary>
public class HeldOrderCartItem
{
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int Qty { get; set; }
}

/// <summary>
/// Request to create a new held order
/// </summary>
public class CreateHeldOrderRequest
{
    public string? CustomerName { get; set; }
    public string? Notes { get; set; }
    public List<HeldOrderCartItem> Items { get; set; } = new();
    public decimal Discount { get; set; } = 0;
    public string DiscountType { get; set; } = "nominal";
}

/// <summary>
/// Response for held order
/// </summary>
public class HeldOrderResponse
{
    public Guid Id { get; set; }
    public Guid CashierId { get; set; }
    public string CashierName { get; set; } = string.Empty;
    public string? CustomerName { get; set; }
    public string? Notes { get; set; }
    public List<HeldOrderCartItem> Items { get; set; } = new();
    public decimal Discount { get; set; }
    public string DiscountType { get; set; } = "nominal";
    public decimal Subtotal { get; set; }
    public DateTime CreatedAt { get; set; }
}
