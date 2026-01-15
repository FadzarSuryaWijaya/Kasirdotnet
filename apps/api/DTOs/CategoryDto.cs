namespace WarungKopiAPI.DTOs;

public class CategoryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? IconPreset { get; set; }
    public string? IconCustom { get; set; }
    public bool IsActive { get; set; }
}

public class CreateCategoryDto
{
    public string Name { get; set; } = string.Empty;
    public string? IconPreset { get; set; }
    public string? IconCustom { get; set; }
}
