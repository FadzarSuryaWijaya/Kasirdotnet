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
    Task<DeleteCheckResult> CheckDeleteAsync(Guid id);
    Task<DeleteCheckResult> CheckDeleteBatchAsync(IEnumerable<Guid> ids);
    Task<DeleteResult> DeleteCategoryAsync(Guid id, bool forceDelete = false);
    Task<DeleteResult> DeleteCategoriesAsync(IEnumerable<Guid> ids, bool forceDelete = false);
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

    public async Task<DeleteCheckResult> CheckDeleteAsync(Guid id)
    {
        var category = await _context.Categories.FindAsync(id);
        if (category == null)
            return new DeleteCheckResult { CanDelete = false, Message = "Kategori tidak ditemukan" };

        var productCount = await _context.Products.CountAsync(p => p.CategoryId == id);
        var hasProducts = productCount > 0;

        // Check if any products have transactions
        var transactionCount = 0;
        if (hasProducts)
        {
            transactionCount = await _context.TransactionItems
                .Where(ti => _context.Products.Any(p => p.CategoryId == id && p.Id == ti.ProductId))
                .CountAsync();
        }

        var hasTransactions = transactionCount > 0;

        string message;
        if (hasTransactions)
            message = $"Kategori memiliki {productCount} produk dengan {transactionCount} riwayat transaksi. Hanya bisa dinonaktifkan.";
        else if (hasProducts)
            message = $"Kategori memiliki {productCount} produk. Bisa dihapus permanen (produk akan ikut terhapus) atau dinonaktifkan.";
        else
            message = "Kategori tidak memiliki produk. Bisa dihapus permanen atau dinonaktifkan.";

        return new DeleteCheckResult
        {
            CanDelete = !hasTransactions,
            HasTransactions = hasTransactions,
            HasStockHistory = hasProducts, // Reuse for product count
            TransactionCount = transactionCount,
            StockHistoryCount = productCount, // Reuse for product count
            Message = message
        };
    }

    public async Task<DeleteCheckResult> CheckDeleteBatchAsync(IEnumerable<Guid> ids)
    {
        var idList = ids.ToList();
        
        var productCount = await _context.Products
            .Where(p => idList.Contains(p.CategoryId))
            .CountAsync();

        var transactionCount = await _context.TransactionItems
            .Where(ti => _context.Products.Any(p => idList.Contains(p.CategoryId) && p.Id == ti.ProductId))
            .CountAsync();

        var hasProducts = productCount > 0;
        var hasTransactions = transactionCount > 0;

        string message;
        if (hasTransactions)
            message = $"Kategori memiliki {productCount} produk dengan {transactionCount} riwayat transaksi. Kategori dengan transaksi hanya bisa dinonaktifkan.";
        else if (hasProducts)
            message = $"Kategori memiliki {productCount} produk. Bisa dihapus permanen (produk akan ikut terhapus) atau dinonaktifkan.";
        else
            message = "Semua kategori tidak memiliki produk. Bisa dihapus permanen atau dinonaktifkan.";

        return new DeleteCheckResult
        {
            CanDelete = !hasTransactions,
            HasTransactions = hasTransactions,
            HasStockHistory = hasProducts,
            TransactionCount = transactionCount,
            StockHistoryCount = productCount,
            Message = message
        };
    }

    public async Task<DeleteResult> DeleteCategoryAsync(Guid id, bool forceDelete = false)
    {
        var category = await _context.Categories.FindAsync(id);

        if (category == null)
            return new DeleteResult { Success = false, Message = "Kategori tidak ditemukan" };

        // NONAKTIFKAN (forceDelete = false)
        if (!forceDelete)
        {
            // Always soft delete - just deactivate
            category.IsActive = false;
            category.UpdatedAt = DateTime.UtcNow;
            _context.Categories.Update(category);
            await _context.SaveChangesAsync();
            return new DeleteResult { Success = true, DeactivatedCount = 1, Message = "Kategori berhasil dinonaktifkan" };
        }

        // HAPUS PERMANEN (forceDelete = true)
        // Check if category has products with transactions
        var productsWithTransactions = await _context.Products
            .Where(p => p.CategoryId == id)
            .Where(p => _context.TransactionItems.Any(ti => ti.ProductId == p.Id))
            .AnyAsync();

        if (productsWithTransactions)
        {
            // Can only soft delete
            category.IsActive = false;
            category.UpdatedAt = DateTime.UtcNow;
            _context.Categories.Update(category);
            await _context.SaveChangesAsync();
            return new DeleteResult { Success = true, DeactivatedCount = 1, Message = "Kategori dinonaktifkan karena produknya memiliki riwayat transaksi" };
        }

        // Delete all products in this category first (and their stock histories)
        var products = await _context.Products.Where(p => p.CategoryId == id).ToListAsync();
        foreach (var product in products)
        {
            var stockHistories = await _context.StockHistories.Where(sh => sh.ProductId == product.Id).ToListAsync();
            _context.StockHistories.RemoveRange(stockHistories);
        }
        _context.Products.RemoveRange(products);

        // Hard delete category
        _context.Categories.Remove(category);
        await _context.SaveChangesAsync();

        return new DeleteResult { Success = true, DeletedCount = 1, Message = "Kategori berhasil dihapus permanen" };
    }

    public async Task<DeleteResult> DeleteCategoriesAsync(IEnumerable<Guid> ids, bool forceDelete = false)
    {
        var idList = ids.ToList();
        var categories = await _context.Categories
            .Where(c => idList.Contains(c.Id))
            .ToListAsync();

        if (!categories.Any())
            return new DeleteResult { Success = false, Message = "Tidak ada kategori yang ditemukan" };

        // NONAKTIFKAN (forceDelete = false)
        if (!forceDelete)
        {
            // Always soft delete all - just deactivate
            foreach (var category in categories)
            {
                category.IsActive = false;
                category.UpdatedAt = DateTime.UtcNow;
            }
            _context.Categories.UpdateRange(categories);
            await _context.SaveChangesAsync();
            return new DeleteResult { Success = true, DeactivatedCount = categories.Count, Message = $"{categories.Count} kategori berhasil dinonaktifkan" };
        }

        // HAPUS PERMANEN (forceDelete = true)
        var categoriesWithTransactions = await _context.Products
            .Where(p => idList.Contains(p.CategoryId))
            .Where(p => _context.TransactionItems.Any(ti => ti.ProductId == p.Id))
            .Select(p => p.CategoryId)
            .Distinct()
            .ToListAsync();

        var deletedCount = 0;
        var deactivatedCount = 0;

        foreach (var category in categories)
        {
            var hasTransactions = categoriesWithTransactions.Contains(category.Id);

            if (hasTransactions)
            {
                // Soft delete if has transactions
                category.IsActive = false;
                category.UpdatedAt = DateTime.UtcNow;
                _context.Categories.Update(category);
                deactivatedCount++;
            }
            else
            {
                // Hard delete - delete products and stock histories first
                var products = await _context.Products.Where(p => p.CategoryId == category.Id).ToListAsync();
                foreach (var product in products)
                {
                    var stockHistories = await _context.StockHistories.Where(sh => sh.ProductId == product.Id).ToListAsync();
                    _context.StockHistories.RemoveRange(stockHistories);
                }
                _context.Products.RemoveRange(products);
                _context.Categories.Remove(category);
                deletedCount++;
            }
        }

        await _context.SaveChangesAsync();
        
        var message = "";
        if (deletedCount > 0 && deactivatedCount > 0)
            message = $"{deletedCount} kategori dihapus permanen, {deactivatedCount} kategori dinonaktifkan";
        else if (deletedCount > 0)
            message = $"{deletedCount} kategori berhasil dihapus permanen";
        else
            message = $"{deactivatedCount} kategori dinonaktifkan";

        return new DeleteResult 
        { 
            Success = true, 
            DeletedCount = deletedCount, 
            DeactivatedCount = deactivatedCount,
            Message = message
        };
    }
}
