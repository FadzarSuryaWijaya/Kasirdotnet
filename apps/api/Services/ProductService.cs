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
    Task<DeleteCheckResult> CheckDeleteAsync(Guid id);
    Task<DeleteCheckResult> CheckDeleteBatchAsync(IEnumerable<Guid> ids);
    Task<DeleteResult> DeleteProductAsync(Guid id, bool forceDelete = false);
    Task<DeleteResult> DeleteProductsAsync(IEnumerable<Guid> ids, bool forceDelete = false);
}

public class DeleteResult
{
    public int DeletedCount { get; set; }
    public int DeactivatedCount { get; set; }
    public bool Success { get; set; }
    public string? Message { get; set; }
}

public class DeleteCheckResult
{
    public bool CanDelete { get; set; }
    public bool HasTransactions { get; set; }
    public bool HasStockHistory { get; set; }
    public int TransactionCount { get; set; }
    public int StockHistoryCount { get; set; }
    public bool IsAlreadyInactive { get; set; } // Tambahan: apakah sudah nonaktif
    public string? Message { get; set; }
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

    public async Task<DeleteCheckResult> CheckDeleteAsync(Guid id)
    {
        var product = await _context.Products.FindAsync(id);
        if (product == null)
            return new DeleteCheckResult { CanDelete = false, Message = "Produk tidak ditemukan" };

        var transactionCount = await _context.TransactionItems.CountAsync(ti => ti.ProductId == id);
        var stockHistoryCount = await _context.StockHistories.CountAsync(sh => sh.ProductId == id);

        var hasTransactions = transactionCount > 0;
        var hasStockHistory = stockHistoryCount > 0;

        string message;
        if (hasTransactions)
            message = $"Produk memiliki {transactionCount} riwayat transaksi. Hanya bisa dinonaktifkan.";
        else if (hasStockHistory)
            message = $"Produk memiliki {stockHistoryCount} riwayat stok. Bisa dihapus permanen (riwayat stok akan ikut terhapus) atau dinonaktifkan.";
        else
            message = "Produk tidak memiliki data terkait. Bisa dihapus permanen atau dinonaktifkan.";

        return new DeleteCheckResult
        {
            CanDelete = !hasTransactions,
            HasTransactions = hasTransactions,
            HasStockHistory = hasStockHistory,
            TransactionCount = transactionCount,
            StockHistoryCount = stockHistoryCount,
            Message = message
        };
    }

    public async Task<DeleteCheckResult> CheckDeleteBatchAsync(IEnumerable<Guid> ids)
    {
        var idList = ids.ToList();
        
        var transactionCount = await _context.TransactionItems
            .Where(ti => idList.Contains(ti.ProductId))
            .CountAsync();
        
        var stockHistoryCount = await _context.StockHistories
            .Where(sh => idList.Contains(sh.ProductId))
            .CountAsync();

        var productsWithTransactions = await _context.TransactionItems
            .Where(ti => idList.Contains(ti.ProductId))
            .Select(ti => ti.ProductId)
            .Distinct()
            .CountAsync();

        var hasTransactions = transactionCount > 0;
        var hasStockHistory = stockHistoryCount > 0;

        string message;
        if (hasTransactions)
            message = $"{productsWithTransactions} produk memiliki riwayat transaksi ({transactionCount} total). Produk dengan transaksi hanya bisa dinonaktifkan.";
        else if (hasStockHistory)
            message = $"Beberapa produk memiliki {stockHistoryCount} riwayat stok. Bisa dihapus permanen (riwayat stok akan ikut terhapus) atau dinonaktifkan.";
        else
            message = "Semua produk tidak memiliki data terkait. Bisa dihapus permanen atau dinonaktifkan.";

        return new DeleteCheckResult
        {
            CanDelete = !hasTransactions,
            HasTransactions = hasTransactions,
            HasStockHistory = hasStockHistory,
            TransactionCount = transactionCount,
            StockHistoryCount = stockHistoryCount,
            Message = message
        };
    }

    public async Task<DeleteResult> DeleteProductAsync(Guid id, bool forceDelete = false)
    {
        var product = await _context.Products.FindAsync(id);

        if (product == null)
            return new DeleteResult { Success = false, Message = "Produk tidak ditemukan" };

        // Check if product has transactions or stock history
        var hasTransactions = await _context.TransactionItems.AnyAsync(ti => ti.ProductId == id);
        var hasStockHistory = await _context.StockHistories.AnyAsync(sh => sh.ProductId == id);

        // NONAKTIFKAN (forceDelete = false)
        if (!forceDelete)
        {
            // Always soft delete - just deactivate
            product.IsActive = false;
            product.UpdatedAt = DateTime.UtcNow;
            _context.Products.Update(product);
            await _context.SaveChangesAsync();
            return new DeleteResult { Success = true, DeactivatedCount = 1, Message = "Produk berhasil dinonaktifkan" };
        }

        // HAPUS PERMANEN (forceDelete = true)
        if (hasTransactions)
        {
            // Cannot hard delete if has transactions - only soft delete
            product.IsActive = false;
            product.UpdatedAt = DateTime.UtcNow;
            _context.Products.Update(product);
            await _context.SaveChangesAsync();
            return new DeleteResult { Success = true, DeactivatedCount = 1, Message = "Produk dinonaktifkan karena memiliki riwayat transaksi (tidak bisa dihapus permanen)" };
        }

        if (hasStockHistory)
        {
            // Delete stock histories first, then hard delete product
            var stockHistories = await _context.StockHistories.Where(sh => sh.ProductId == id).ToListAsync();
            _context.StockHistories.RemoveRange(stockHistories);
        }

        // Hard delete product
        _context.Products.Remove(product);
        await _context.SaveChangesAsync();

        return new DeleteResult { Success = true, DeletedCount = 1, Message = "Produk berhasil dihapus permanen" };
    }

    public async Task<DeleteResult> DeleteProductsAsync(IEnumerable<Guid> ids, bool forceDelete = false)
    {
        var idList = ids.ToList();
        var products = await _context.Products
            .Where(p => idList.Contains(p.Id))
            .ToListAsync();

        if (!products.Any())
            return new DeleteResult { Success = false, Message = "Tidak ada produk yang ditemukan" };

        // NONAKTIFKAN (forceDelete = false)
        if (!forceDelete)
        {
            // Always soft delete all - just deactivate
            foreach (var product in products)
            {
                product.IsActive = false;
                product.UpdatedAt = DateTime.UtcNow;
            }
            _context.Products.UpdateRange(products);
            await _context.SaveChangesAsync();
            return new DeleteResult { Success = true, DeactivatedCount = products.Count, Message = $"{products.Count} produk berhasil dinonaktifkan" };
        }

        // HAPUS PERMANEN (forceDelete = true)
        var productsWithTransactions = await _context.TransactionItems
            .Where(ti => idList.Contains(ti.ProductId))
            .Select(ti => ti.ProductId)
            .Distinct()
            .ToListAsync();

        var deletedCount = 0;
        var deactivatedCount = 0;

        foreach (var product in products)
        {
            var hasTransactions = productsWithTransactions.Contains(product.Id);

            if (hasTransactions)
            {
                // Soft delete if has transactions
                product.IsActive = false;
                product.UpdatedAt = DateTime.UtcNow;
                _context.Products.Update(product);
                deactivatedCount++;
            }
            else
            {
                // Hard delete if no transactions
                var stockHistories = await _context.StockHistories.Where(sh => sh.ProductId == product.Id).ToListAsync();
                _context.StockHistories.RemoveRange(stockHistories);
                _context.Products.Remove(product);
                deletedCount++;
            }
        }

        await _context.SaveChangesAsync();
        
        var message = "";
        if (deletedCount > 0 && deactivatedCount > 0)
            message = $"{deletedCount} produk dihapus permanen, {deactivatedCount} produk dinonaktifkan";
        else if (deletedCount > 0)
            message = $"{deletedCount} produk berhasil dihapus permanen";
        else
            message = $"{deactivatedCount} produk dinonaktifkan";

        return new DeleteResult 
        { 
            Success = true, 
            DeletedCount = deletedCount, 
            DeactivatedCount = deactivatedCount,
            Message = message
        };
    }
}
