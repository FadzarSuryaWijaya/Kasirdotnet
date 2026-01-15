using WarungKopiAPI.Data;
using WarungKopiAPI.DTOs;
using WarungKopiAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace WarungKopiAPI.Services;

public interface ICategoryService
{
    Task<IEnumerable<CategoryDto>> GetAllCategoriesAsync();
    Task<CategoryDto?> GetCategoryByIdAsync(Guid id);
    Task<CategoryDto> CreateCategoryAsync(CreateCategoryDto dto);
    Task<bool> UpdateCategoryAsync(Guid id, CreateCategoryDto dto);
    Task<bool> DeleteCategoryAsync(Guid id);
}

public class CategoryService : ICategoryService
{
    private readonly WarungKopiDbContext _context;

    public CategoryService(WarungKopiDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<CategoryDto>> GetAllCategoriesAsync()
    {
        var categories = await _context.Categories
            .Where(c => c.IsActive)
            .Select(c => new CategoryDto
            {
                Id = c.Id,
                Name = c.Name,
                IconPreset = c.IconPreset,
                IconCustom = c.IconCustom,
                IsActive = c.IsActive
            })
            .ToListAsync();

        return categories;
    }

    public async Task<CategoryDto?> GetCategoryByIdAsync(Guid id)
    {
        var category = await _context.Categories.FindAsync(id);

        if (category == null || !category.IsActive)
            return null;

        return new CategoryDto
        {
            Id = category.Id,
            Name = category.Name,
            IconPreset = category.IconPreset,
            IconCustom = category.IconCustom,
            IsActive = category.IsActive
        };
    }

    public async Task<CategoryDto> CreateCategoryAsync(CreateCategoryDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            throw new ArgumentException("Category name is required");

        var category = new Category
        {
            Id = Guid.NewGuid(),
            Name = dto.Name.Trim(),
            IconPreset = dto.IconPreset,
            IconCustom = dto.IconCustom,
            IsActive = true
        };

        _context.Categories.Add(category);
        await _context.SaveChangesAsync();

        return new CategoryDto
        {
            Id = category.Id,
            Name = category.Name,
            IconPreset = category.IconPreset,
            IconCustom = category.IconCustom,
            IsActive = category.IsActive
        };
    }

    public async Task<bool> UpdateCategoryAsync(Guid id, CreateCategoryDto dto)
    {
        var category = await _context.Categories.FindAsync(id);

        if (category == null)
            return false;

        if (string.IsNullOrWhiteSpace(dto.Name))
            throw new ArgumentException("Category name is required");

        category.Name = dto.Name.Trim();
        category.IconPreset = dto.IconPreset;
        category.IconCustom = dto.IconCustom;
        category.UpdatedAt = DateTime.UtcNow;

        _context.Categories.Update(category);
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> DeleteCategoryAsync(Guid id)
    {
        var category = await _context.Categories.FindAsync(id);

        if (category == null)
            return false;

        category.IsActive = false;
        category.UpdatedAt = DateTime.UtcNow;

        _context.Categories.Update(category);
        await _context.SaveChangesAsync();

        return true;
    }
}
