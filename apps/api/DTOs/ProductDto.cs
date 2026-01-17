namespace WarungKopiAPI.DTOs;

public class ProductDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public Guid CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public decimal Price { get; set; }
    public string? ImageUrl { get; set; }
    public bool IsActive { get; set; }
}

public class CreateProductDto
{
    public string Name { get; set; } = string.Empty;
    public Guid CategoryId { get; set; }
    public decimal Price { get; set; }
    public string? ImageUrl { get; set; }
    public bool IsActive { get; set; } = true;
}

public class UpdateProductDto
{
    public string Name { get; set; } = string.Empty;
    public Guid CategoryId { get; set; }
    public decimal Price { get; set; }
    public string? ImageUrl { get; set; }
}

public class UpdateProductActiveDto
{
    public bool IsActive { get; set; }
}

public class DeleteProductsDto
{
    public List<Guid> Ids { get; set; } = new();
    public bool ForceDelete { get; set; } = false;
}

public class CheckDeleteBatchDto
{
    public List<Guid> Ids { get; set; } = new();
}
