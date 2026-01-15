using WarungKopiAPI.Data;
using WarungKopiAPI.DTOs;
using WarungKopiAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace WarungKopiAPI.Services;

public interface IProductService
{
    Task<IEnumerable<ProductDto>> GetProductsAsync(string? search = null, Guid? categoryId = null, bool? isActive = null);
    Task<ProductDto?> GetProductByIdAsync(Guid id);
    Task<ProductDto> CreateProductAsync(CreateProductDto dto);
    Task<bool> UpdateProductAsync(Guid id, UpdateProductDto dto);
    Task<bool> UpdateProductActiveAsync(Guid id, bool isActive);
}

public class ProductService : IProductService
{
    private readonly WarungKopiDbContext _context;

    public ProductService(WarungKopiDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<ProductDto>> GetProductsAsync(string? search = null, Guid? categoryId = null, bool? isActive = null)
    {
        var query = _context.Products.Include(p => p.Category).AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(p => p.Name.Contains(search));
        }

        if (categoryId.HasValue)
        {
            query = query.Where(p => p.CategoryId == categoryId.Value);
        }

        if (isActive.HasValue)
        {
            query = query.Where(p => p.IsActive == isActive.Value);
        }

        var products = await query
            .Select(p => new ProductDto
            {
                Id = p.Id,
                Name = p.Name,
                CategoryId = p.CategoryId,
                CategoryName = p.Category!.Name,
                Price = p.Price,
                ImageUrl = p.ImageUrl,
                IsActive = p.IsActive
            })
            .ToListAsync();

        return products;
    }

    public async Task<ProductDto?> GetProductByIdAsync(Guid id)
    {
        var product = await _context.Products
            .Include(p => p.Category)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (product == null)
            return null;

        return new ProductDto
        {
            Id = product.Id,
            Name = product.Name,
            CategoryId = product.CategoryId,
            CategoryName = product.Category?.Name,
            Price = product.Price,
            ImageUrl = product.ImageUrl,
            IsActive = product.IsActive
        };
    }

    public async Task<ProductDto> CreateProductAsync(CreateProductDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            throw new ArgumentException("Product name is required");

        if (dto.Price <= 0)
            throw new ArgumentException("Product price must be greater than 0");

        // Verify category exists
        var categoryExists = await _context.Categories.AnyAsync(c => c.Id == dto.CategoryId && c.IsActive);
        if (!categoryExists)
            throw new ArgumentException("Category not found");

        var product = new Product
        {
            Id = Guid.NewGuid(),
            Name = dto.Name.Trim(),
            CategoryId = dto.CategoryId,
            Price = dto.Price,
            ImageUrl = dto.ImageUrl,
            IsActive = dto.IsActive
        };

        _context.Products.Add(product);
        await _context.SaveChangesAsync();

        var category = await _context.Categories.FindAsync(dto.CategoryId);

        return new ProductDto
        {
            Id = product.Id,
            Name = product.Name,
            CategoryId = product.CategoryId,
            CategoryName = category?.Name,
            Price = product.Price,
            ImageUrl = product.ImageUrl,
            IsActive = product.IsActive
        };
    }

    public async Task<bool> UpdateProductAsync(Guid id, UpdateProductDto dto)
    {
        var product = await _context.Products.FindAsync(id);

        if (product == null)
            return false;

        if (string.IsNullOrWhiteSpace(dto.Name))
            throw new ArgumentException("Product name is required");

        if (dto.Price <= 0)
            throw new ArgumentException("Product price must be greater than 0");

        // Verify category exists
        var categoryExists = await _context.Categories.AnyAsync(c => c.Id == dto.CategoryId && c.IsActive);
        if (!categoryExists)
            throw new ArgumentException("Category not found");

        product.Name = dto.Name.Trim();
        product.CategoryId = dto.CategoryId;
        product.Price = dto.Price;
        product.ImageUrl = dto.ImageUrl;
        product.UpdatedAt = DateTime.UtcNow;

        _context.Products.Update(product);
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> UpdateProductActiveAsync(Guid id, bool isActive)
    {
        var product = await _context.Products.FindAsync(id);

        if (product == null)
            return false;

        product.IsActive = isActive;
        product.UpdatedAt = DateTime.UtcNow;

        _context.Products.Update(product);
        await _context.SaveChangesAsync();

        return true;
    }
}
