namespace WarungKopiAPI.Models;

/// <summary>
/// Represents a temporarily held/parked order that can be resumed later
/// </summary>
public class HeldOrder
{
    public Guid Id { get; set; }
    public Guid CashierId { get; set; }
    public User Cashier { get; set; } = null!;
    
    /// <summary>
    /// Customer name or table number for identification
    /// </summary>
    public string? CustomerName { get; set; }
    
    /// <summary>
    /// Optional notes about the held order
    /// </summary>
    public string? Notes { get; set; }
    
    /// <summary>
    /// JSON serialized cart items: [{productId, productName, price, qty}]
    /// </summary>
    public string CartJson { get; set; } = "[]";
    
    /// <summary>
    /// Discount value (not calculated, raw input)
    /// </summary>
    public decimal Discount { get; set; } = 0;
    
    /// <summary>
    /// Discount type: "nominal" or "percent"
    /// </summary>
    public string DiscountType { get; set; } = "nominal";
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
