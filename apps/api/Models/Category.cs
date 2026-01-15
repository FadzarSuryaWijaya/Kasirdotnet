namespace WarungKopiAPI.Models;

public class Category
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? IconPreset { get; set; }  // Material Symbols icon name (e.g., "coffee", "bakery_dining")
    public string? IconCustom { get; set; }  // Custom icon class (e.g., "fa-solid fa-mug-saucer")
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation property
    public ICollection<Product> Products { get; set; } = new List<Product>();
}
