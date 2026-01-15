using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WarungKopiAPI.Data;
using WarungKopiAPI.DTOs;
using WarungKopiAPI.Models;
using WarungKopiAPI.Services;
using System.Security.Claims;

namespace WarungKopiAPI.Controllers;

[ApiController]
[Route("api/transactions")]
[Authorize(Roles = "Admin,Kasir")]
public class TransactionsController : ControllerBase
{
    private readonly TransactionService _transactionService;
    private readonly WarungKopiDbContext _context;
    private readonly AuditService _auditService;

    public TransactionsController(TransactionService transactionService, WarungKopiDbContext context, AuditService auditService)
    {
        _transactionService = transactionService;
        _context = context;
        _auditService = auditService;
    }

    /// <summary>
    /// Create a new transaction
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateTransaction([FromBody] CreateTransactionRequest request)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "");
            var transaction = await _transactionService.CreateTransactionAsync(userId, request);
            return CreatedAtAction(nameof(GetTransaction), new { id = transaction.Id }, transaction);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            System.Console.WriteLine($"Error creating transaction: {ex.Message}");
            System.Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return StatusCode(500, new { message = ex.Message, details = ex.InnerException?.Message });
        }
    }

    /// <summary>
    /// Get transaction by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetTransaction(Guid id)
    {
        try
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Unauthorized(new { message = "Invalid token" });

            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            var transaction = await _transactionService.GetTransactionByIdAsync(id);

            // Kasir can only view their own transactions
            if (userRole == "Kasir" && transaction.CashierId != userId)
                return Forbid();

            return Ok(transaction);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Transaction not found" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    /// <summary>
    /// List transactions with filtering
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> ListTransactions(
        [FromQuery] DateTime? dateFrom = null,
        [FromQuery] DateTime? dateTo = null,
        [FromQuery] bool mine = false,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        try
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Unauthorized(new { message = "Invalid token" });

            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            // Kasir can only view their own transactions
            Guid? filterUserId = null;
            if (userRole == "Kasir")
                filterUserId = userId;
            else if (mine)
                filterUserId = userId;

            var (items, total) = await _transactionService.ListTransactionsAsync(
                filterUserId,
                dateFrom,
                dateTo,
                page,
                pageSize);

            return Ok(new
            {
                items,
                total,
                page,
                pageSize,
                pages = (total + pageSize - 1) / pageSize
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    /// <summary>
    /// Void a transaction (Admin only)
    /// </summary>
    [HttpPost("{id}/void")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> VoidTransaction(Guid id, [FromBody] VoidTransactionRequest request)
    {
        try
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Unauthorized(new { message = "Invalid token" });

            var transaction = await _context.Transactions
                .Include(t => t.Items)
                .ThenInclude(i => i.Product)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (transaction == null)
                return NotFound(new { message = "Transaction not found" });

            if (transaction.Status != TransactionStatus.Completed)
                return BadRequest(new { message = "Transaksi sudah di-void atau refund" });

            if (string.IsNullOrWhiteSpace(request.Reason))
                return BadRequest(new { message = "Alasan void wajib diisi" });

            // Void the transaction
            transaction.Status = TransactionStatus.Voided;
            transaction.VoidedAt = DateTime.UtcNow;
            transaction.VoidedById = userId;
            transaction.VoidReason = request.Reason;

            // Restore stock for each item
            foreach (var item in transaction.Items)
            {
                var product = await _context.Products.FindAsync(item.ProductId);
                if (product != null && product.TrackStock)
                {
                    var stockBefore = product.Stock;
                    product.Stock += item.Qty;

                    // Record stock history
                    var stockHistory = new StockHistory
                    {
                        Id = Guid.NewGuid(),
                        ProductId = item.ProductId,
                        MovementType = StockMovementType.In,
                        Quantity = item.Qty,
                        StockBefore = stockBefore,
                        StockAfter = product.Stock,
                        Reference = $"VOID-{transaction.InvoiceNo}",
                        Notes = $"Void transaksi: {request.Reason}",
                        UserId = userId,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.StockHistories.Add(stockHistory);
                }
            }

            await _context.SaveChangesAsync();

            // Audit log
            await _auditService.LogAsync(
                AuditAction.TransactionVoided,
                userId,
                "Transaction",
                transaction.Id.ToString(),
                $"Void transaksi {transaction.InvoiceNo}: {request.Reason}"
            );

            return Ok(new { 
                message = "Transaksi berhasil di-void",
                transactionId = transaction.Id,
                invoiceNo = transaction.InvoiceNo,
                status = "Voided"
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    /// <summary>
    /// Get voided transactions list
    /// </summary>
    [HttpGet("voided")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetVoidedTransactions(
        [FromQuery] DateTime? dateFrom = null,
        [FromQuery] DateTime? dateTo = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        try
        {
            var query = _context.Transactions
                .AsNoTracking()
                .Include(t => t.Cashier)
                .Include(t => t.VoidedBy)
                .Where(t => t.Status == TransactionStatus.Voided);

            if (dateFrom.HasValue)
                query = query.Where(t => t.VoidedAt >= dateFrom.Value);
            if (dateTo.HasValue)
                query = query.Where(t => t.VoidedAt <= dateTo.Value);

            var total = await query.CountAsync();

            var transactions = await query
                .OrderByDescending(t => t.VoidedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(t => new VoidedTransactionResponse
                {
                    Id = t.Id.ToString(),
                    InvoiceNo = t.InvoiceNo,
                    CashierName = t.Cashier.Name,
                    Total = t.Total,
                    CreatedAt = t.CreatedAt,
                    VoidedAt = t.VoidedAt,
                    VoidedByName = t.VoidedBy != null ? t.VoidedBy.Name : null,
                    VoidReason = t.VoidReason
                })
                .ToListAsync();

            return Ok(new
            {
                items = transactions,
                total,
                page,
                pageSize,
                pages = (total + pageSize - 1) / pageSize
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }
}
