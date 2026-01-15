using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using WarungKopiAPI.Data;
using WarungKopiAPI.DTOs;
using WarungKopiAPI.Models;

namespace WarungKopiAPI.Controllers;

[ApiController]
[Route("api/stock")]
[Authorize(Roles = "Admin")]
public class StockController : ControllerBase
{
    private readonly WarungKopiDbContext _context;

    public StockController(WarungKopiDbContext context)
    {
        _context = context;
    }

    private Guid GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(claim, out var id) ? id : Guid.Empty;
    }

    /// <summary>
    /// Get stock summary for all products
    /// Menampilkan SEMUA produk aktif, dengan info apakah track stock atau tidak
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetStockSummary([FromQuery] bool? lowStockOnly = null)
    {
        // Query SEMUA produk aktif, bukan hanya yang TrackStock
        var query = _context.Products
            .AsNoTracking()
            .Include(p => p.Category)
            .Where(p => p.IsActive);

        if (lowStockOnly == true)
            query = query.Where(p => p.TrackStock && p.Stock <= 5);

        var products = await query
            .OrderBy(p => p.TrackStock ? p.Stock : int.MaxValue) // Produk dengan stok rendah di atas
            .ThenBy(p => p.Name)
            .Select(p => new ProductStockResponse
            {
                Id = p.Id.ToString(),
                Name = p.Name,
                CategoryName = p.Category != null ? p.Category.Name : "",
                Stock = p.Stock,
                TrackStock = p.TrackStock,
                IsLowStock = p.TrackStock && p.Stock <= 5 && p.Stock > 0,
                IsOutOfStock = p.TrackStock && p.Stock <= 0
            })
            .ToListAsync();

        // Hitung summary hanya untuk produk yang TrackStock
        var trackedProducts = products.Where(p => p.TrackStock).ToList();

        var summary = new StockSummaryResponse
        {
            TotalProducts = products.Count,
            LowStockCount = trackedProducts.Count(p => p.IsLowStock),
            OutOfStockCount = trackedProducts.Count(p => p.IsOutOfStock),
            Products = products
        };

        return Ok(summary);
    }

    /// <summary>
    /// Toggle track stock untuk produk
    /// </summary>
    [HttpPatch("{productId}/track-stock")]
    public async Task<IActionResult> ToggleTrackStock(string productId, [FromBody] ToggleTrackStockRequest request)
    {
        if (!Guid.TryParse(productId, out var pid))
            return BadRequest(new { message = "Invalid product ID" });

        var product = await _context.Products.FindAsync(pid);
        if (product == null)
            return NotFound(new { message = "Product not found" });

        product.TrackStock = request.TrackStock;
        product.UpdatedAt = DateTime.UtcNow;

        // Jika baru aktifkan track stock dan stok masih 0, biarkan admin set manual
        await _context.SaveChangesAsync();

        return Ok(new { 
            message = request.TrackStock ? "Tracking stok diaktifkan" : "Tracking stok dinonaktifkan",
            trackStock = product.TrackStock,
            stock = product.Stock
        });
    }

    /// <summary>
    /// Bulk enable track stock untuk semua produk
    /// </summary>
    [HttpPost("enable-all-tracking")]
    public async Task<IActionResult> EnableAllTracking()
    {
        var products = await _context.Products
            .Where(p => p.IsActive && !p.TrackStock)
            .ToListAsync();

        foreach (var p in products)
        {
            p.TrackStock = true;
            p.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        return Ok(new { 
            message = $"Tracking stok diaktifkan untuk {products.Count} produk",
            count = products.Count
        });
    }

    /// <summary>
    /// Restock a product (add stock)
    /// </summary>
    [HttpPost("{productId}/restock")]
    public async Task<IActionResult> Restock(string productId, [FromBody] RestockRequest request)
    {
        if (!Guid.TryParse(productId, out var pid))
            return BadRequest(new { message = "Invalid product ID" });

        if (request.Quantity <= 0)
            return BadRequest(new { message = "Quantity harus lebih dari 0" });

        var product = await _context.Products.FindAsync(pid);
        if (product == null)
            return NotFound(new { message = "Product not found" });

        var stockBefore = product.Stock;
        product.Stock += request.Quantity;
        product.UpdatedAt = DateTime.UtcNow;

        var history = new StockHistory
        {
            Id = Guid.NewGuid(),
            ProductId = pid,
            MovementType = StockMovementType.In,
            Quantity = request.Quantity,
            StockBefore = stockBefore,
            StockAfter = product.Stock,
            Notes = request.Notes,
            UserId = GetUserId(),
            CreatedAt = DateTime.UtcNow
        };

        _context.StockHistories.Add(history);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Stok berhasil ditambah", stock = product.Stock });
    }

    /// <summary>
    /// Adjust stock (can be positive or negative)
    /// </summary>
    [HttpPost("{productId}/adjust")]
    public async Task<IActionResult> AdjustStock(string productId, [FromBody] StockAdjustRequest request)
    {
        if (!Guid.TryParse(productId, out var pid))
            return BadRequest(new { message = "Invalid product ID" });

        if (request.Quantity == 0)
            return BadRequest(new { message = "Quantity tidak boleh 0" });

        var product = await _context.Products.FindAsync(pid);
        if (product == null)
            return NotFound(new { message = "Product not found" });

        var stockBefore = product.Stock;
        product.Stock += request.Quantity;
        if (product.Stock < 0) product.Stock = 0; // Prevent negative stock
        product.UpdatedAt = DateTime.UtcNow;

        var history = new StockHistory
        {
            Id = Guid.NewGuid(),
            ProductId = pid,
            MovementType = StockMovementType.Adjust,
            Quantity = request.Quantity,
            StockBefore = stockBefore,
            StockAfter = product.Stock,
            Notes = request.Notes,
            UserId = GetUserId(),
            CreatedAt = DateTime.UtcNow
        };

        _context.StockHistories.Add(history);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Stok berhasil disesuaikan", stock = product.Stock });
    }

    /// <summary>
    /// Set stock to specific value
    /// </summary>
    [HttpPost("{productId}/set")]
    public async Task<IActionResult> SetStock(string productId, [FromBody] SetStockRequest request)
    {
        if (!Guid.TryParse(productId, out var pid))
            return BadRequest(new { message = "Invalid product ID" });

        if (request.NewStock < 0)
            return BadRequest(new { message = "Stok tidak boleh negatif" });

        var product = await _context.Products.FindAsync(pid);
        if (product == null)
            return NotFound(new { message = "Product not found" });

        var stockBefore = product.Stock;
        var diff = request.NewStock - stockBefore;
        product.Stock = request.NewStock;
        product.UpdatedAt = DateTime.UtcNow;

        var history = new StockHistory
        {
            Id = Guid.NewGuid(),
            ProductId = pid,
            MovementType = StockMovementType.Adjust,
            Quantity = diff,
            StockBefore = stockBefore,
            StockAfter = product.Stock,
            Notes = request.Notes ?? "Set stok manual",
            UserId = GetUserId(),
            CreatedAt = DateTime.UtcNow
        };

        _context.StockHistories.Add(history);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Stok berhasil diset", stock = product.Stock });
    }

    /// <summary>
    /// Get stock history for a product
    /// </summary>
    [HttpGet("{productId}/history")]
    public async Task<IActionResult> GetProductHistory(string productId, [FromQuery] int limit = 50)
    {
        if (!Guid.TryParse(productId, out var pid))
            return BadRequest(new { message = "Invalid product ID" });

        var history = await _context.StockHistories
            .AsNoTracking()
            .Include(h => h.Product)
            .Include(h => h.User)
            .Where(h => h.ProductId == pid)
            .OrderByDescending(h => h.CreatedAt)
            .Take(limit)
            .Select(h => new StockHistoryResponse
            {
                Id = h.Id.ToString(),
                ProductId = h.ProductId.ToString(),
                ProductName = h.Product.Name,
                MovementType = h.MovementType.ToString(),
                Quantity = h.Quantity,
                StockBefore = h.StockBefore,
                StockAfter = h.StockAfter,
                Reference = h.Reference,
                Notes = h.Notes,
                UserName = h.User != null ? h.User.Name : null,
                CreatedAt = h.CreatedAt
            })
            .ToListAsync();

        return Ok(history);
    }

    /// <summary>
    /// Get all stock history (recent movements)
    /// </summary>
    [HttpGet("history")]
    public async Task<IActionResult> GetAllHistory([FromQuery] int limit = 100, [FromQuery] string? type = null)
    {
        var query = _context.StockHistories
            .AsNoTracking()
            .Include(h => h.Product)
            .Include(h => h.User)
            .AsQueryable();

        if (!string.IsNullOrEmpty(type) && Enum.TryParse<StockMovementType>(type, true, out var movementType))
            query = query.Where(h => h.MovementType == movementType);

        var history = await query
            .OrderByDescending(h => h.CreatedAt)
            .Take(limit)
            .Select(h => new StockHistoryResponse
            {
                Id = h.Id.ToString(),
                ProductId = h.ProductId.ToString(),
                ProductName = h.Product.Name,
                MovementType = h.MovementType.ToString(),
                Quantity = h.Quantity,
                StockBefore = h.StockBefore,
                StockAfter = h.StockAfter,
                Reference = h.Reference,
                Notes = h.Notes,
                UserName = h.User != null ? h.User.Name : null,
                CreatedAt = h.CreatedAt
            })
            .ToListAsync();

        return Ok(history);
    }
}
