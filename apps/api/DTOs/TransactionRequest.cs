namespace WarungKopiAPI.DTOs;

/// <summary>
/// Discount type: Nominal (fixed amount) or Percent (percentage of subtotal)
/// </summary>
public enum DiscountType
{
    Nominal,  // Rp (fixed amount, e.g., Rp 5.000)
    Percent   // % (percentage, e.g., 10%)
}

public class CreateTransactionItemRequest
{
    public Guid ProductId { get; set; }
    public int Qty { get; set; }
}

public class CreateTransactionRequest
{
    public List<CreateTransactionItemRequest> Items { get; set; } = new();
    public decimal Discount { get; set; } = 0;
    public DiscountType DiscountType { get; set; } = DiscountType.Nominal;  // Default to nominal
    public decimal Tax { get; set; } = 0;
    public string PaymentMethod { get; set; } = "Cash"; // Cash, QRIS
    public decimal PaidAmount { get; set; }
    public string? Notes { get; set; }
}
