using WarungKopiAPI.Data;
using WarungKopiAPI.DTOs;
using WarungKopiAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace WarungKopiAPI.Services;

public class TransactionService
{
    private readonly WarungKopiDbContext _context;

    public TransactionService(WarungKopiDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Create a new transaction with items and calculate totals
    /// </summary>
    public async Task<TransactionResponse> CreateTransactionAsync(Guid cashierId, CreateTransactionRequest request)
    {
        try
        {
            if (request.Items == null || request.Items.Count == 0)
                throw new ArgumentException("Transaction must have at least one item");

            if (request.PaymentMethod != "Cash" && request.PaymentMethod != "QRIS")
                throw new ArgumentException("Payment method must be Cash or QRIS");

            // Get active session for this cashier
            var activeSession = await _context.CashierSessions
                .FirstOrDefaultAsync(s => s.CashierId == cashierId && s.Status == SessionStatus.Open);

            // P0 FIX: Transaksi WAJIB punya session aktif
            // Ini memastikan semua transaksi tercatat dalam shift kasir
            if (activeSession == null)
                throw new InvalidOperationException("Tidak ada shift aktif. Silakan mulai shift terlebih dahulu sebelum membuat transaksi.");

            // Calculate business date (WIB = UTC+7)
            var wibTime = DateTime.UtcNow.AddHours(7);
            var businessDate = DateOnly.FromDateTime(wibTime);

            var transaction = new Transaction
            {
                Id = Guid.NewGuid(),
                CashierId = cashierId,
                SessionId = activeSession.Id, // WAJIB: Link to active session
                BusinessDate = businessDate, // Set business date for reporting
                PaymentMethod = request.PaymentMethod,
                Discount = request.Discount,
                Tax = request.Tax,
                Notes = request.Notes
            };

            decimal subtotal = 0;
            var productNames = new Dictionary<Guid, string>();

            // Add items and fetch product prices from DB (never trust client prices)
            foreach (var itemRequest in request.Items)
            {
                var product = await _context.Products
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p => p.Id == itemRequest.ProductId && p.IsActive);

                if (product == null)
                    throw new ArgumentException($"Product {itemRequest.ProductId} not found or inactive");

                if (itemRequest.Qty <= 0)
                    throw new ArgumentException("Quantity must be greater than 0");

                var lineTotal = product.Price * itemRequest.Qty;
                subtotal += lineTotal;

                // Store product name for snapshot (don't set navigation property to avoid tracking issues)
                productNames[product.Id] = product.Name;

                var transactionItem = new TransactionItem
                {
                    Id = Guid.NewGuid(),
                    ProductId = product.Id,
                    Qty = itemRequest.Qty,
                    UnitPrice = product.Price,
                    LineTotal = lineTotal
                };
                
                transaction.Items.Add(transactionItem);
            }

            // Calculate totals server-side
            transaction.Subtotal = subtotal;
            
            // Calculate discount based on type
            decimal calculatedDiscount = request.DiscountType == DiscountType.Percent
                ? subtotal * request.Discount / 100  // Percent: 10% of Rp100.000 = Rp10.000
                : request.Discount;                   // Nominal: fixed amount
            
            transaction.Discount = calculatedDiscount;
            transaction.Total = subtotal - calculatedDiscount + request.Tax;

            // Validate payment based on method
            if (request.PaymentMethod == "Cash")
            {
                if (request.PaidAmount < transaction.Total)
                    throw new ArgumentException($"Paid amount must be >= total amount ({transaction.Total})");
                transaction.PaidAmount = request.PaidAmount;
                transaction.ChangeAmount = request.PaidAmount - transaction.Total;
            }
            else if (request.PaymentMethod == "QRIS")
            {
                transaction.PaidAmount = transaction.Total;
                transaction.ChangeAmount = 0;
            }

            // Generate invoice number: WK-YYYYMMDD-{counter}
            var today = DateTime.Now.ToString("yyyyMMdd");
            var lastInvoice = await _context.Transactions
                .AsNoTracking()
                .Where(t => t.InvoiceNo.StartsWith($"WK-{today}"))
                .OrderByDescending(t => t.InvoiceNo)
                .FirstOrDefaultAsync();

            int counter = 1;
            if (lastInvoice != null)
            {
                var lastCounter = int.Parse(lastInvoice.InvoiceNo.Split('-')[2]);
                counter = lastCounter + 1;
            }

            transaction.InvoiceNo = $"WK-{today}-{counter:D4}";
            transaction.CreatedAt = DateTime.UtcNow;

            // Save to database
            _context.Transactions.Add(transaction);
            await _context.SaveChangesAsync();

            // Reduce stock for each item (after transaction saved)
            foreach (var item in transaction.Items)
            {
                var product = await _context.Products.FindAsync(item.ProductId);
                if (product != null && product.TrackStock)
                {
                    var stockBefore = product.Stock;
                    product.Stock = Math.Max(0, product.Stock - item.Qty);
                    
                    // Record stock history
                    var stockHistory = new StockHistory
                    {
                        Id = Guid.NewGuid(),
                        ProductId = item.ProductId,
                        MovementType = StockMovementType.Out,
                        Quantity = -item.Qty,
                        StockBefore = stockBefore,
                        StockAfter = product.Stock,
                        Reference = transaction.InvoiceNo,
                        Notes = "Penjualan",
                        UserId = cashierId,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.StockHistories.Add(stockHistory);
                }
            }
            await _context.SaveChangesAsync();

            // Return as DTO with cashier info
            return await GetTransactionByIdAsync(transaction.Id);
        }
        catch (Exception ex)
        {
            System.Console.WriteLine($"Error in CreateTransactionAsync: {ex.Message}");
            System.Console.WriteLine($"Stack trace: {ex.StackTrace}");
            throw;
        }
    }

    /// <summary>
    /// Create immutable snapshot dari transaction untuk PDF generation
    /// Dipanggil sekali saja saat transaksi selesai dibuat
    /// TEMPORARILY DISABLED - requires TransactionSnapshot table
    /// </summary>
    /*
    private async Task CreateTransactionSnapshotAsync(Transaction transaction, User? cashier, Dictionary<Guid, string> productNames)
    {
        // Prepare items JSON untuk snapshot
        var snapshotItems = transaction.Items.Select(i => new TransactionSnapshotItem
        {
            ProductId = i.ProductId,
            ProductName = productNames.TryGetValue(i.ProductId, out var name) ? name : "Unknown Product",
            Qty = i.Qty,
            UnitPrice = i.UnitPrice,
            LineTotal = i.LineTotal
        }).ToList();

        var itemsJson = System.Text.Json.JsonSerializer.Serialize(snapshotItems);

        var snapshot = new TransactionSnapshot
        {
            Id = Guid.NewGuid(),
            TransactionId = transaction.Id,
            StoreId = Guid.NewGuid(), // TODO: Get from config atau auth context
            StoreName = "WARUNG KOPI", // TODO: Get from config
            StoreAddress = "Jl. Kopi Nikmat No. 123", // TODO: Get from config
            CashierId = transaction.CashierId,
            CashierName = cashier?.Name ?? "Unknown",
            InvoiceNo = transaction.InvoiceNo,
            CreatedAtUtc = transaction.CreatedAt,
            Subtotal = transaction.Subtotal,
            Discount = transaction.Discount,
            Tax = transaction.Tax,
            Total = transaction.Total,
            PaymentMethod = transaction.PaymentMethod,
            PaidAmount = transaction.PaidAmount,
            ChangeAmount = transaction.ChangeAmount,
            Notes = transaction.Notes,
            ItemsJson = itemsJson,
            IsImmutable = true,
            SnapshotCreatedAtUtc = DateTime.UtcNow
        };

        _context.TransactionSnapshots.Add(snapshot);
        await _context.SaveChangesAsync();
    }
    */

    /// <summary>
    /// Get transaction by ID with full details
    /// </summary>
    public async Task<TransactionResponse> GetTransactionByIdAsync(Guid transactionId)
    {
        var transaction = await _context.Transactions
            .AsNoTracking()
            .Include(t => t.Cashier)
            .Include(t => t.VoidedBy)
            .Include(t => t.Items)
            .ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(t => t.Id == transactionId);

        if (transaction == null)
            throw new KeyNotFoundException($"Transaction {transactionId} not found");

        return MapToTransactionResponse(transaction);
    }

    /// <summary>
    /// List transactions with pagination and filtering
    /// </summary>
    public async Task<(List<TransactionListItemResponse> items, int total)> ListTransactionsAsync(
        Guid? userId = null, 
        DateTime? dateFrom = null, 
        DateTime? dateTo = null, 
        int page = 1, 
        int pageSize = 20)
    {
        var query = _context.Transactions
            .AsNoTracking()
            .Include(t => t.Cashier)
            .Include(t => t.Items)
            .AsQueryable();

        // Filter by cashier if userId provided (for Kasir role)
        if (userId.HasValue)
            query = query.Where(t => t.CashierId == userId);

        // Filter by BusinessDate range (more accurate for reporting)
        if (dateFrom.HasValue)
        {
            var fromDate = DateOnly.FromDateTime(dateFrom.Value);
            query = query.Where(t => t.BusinessDate >= fromDate);
        }

        if (dateTo.HasValue)
        {
            var toDate = DateOnly.FromDateTime(dateTo.Value);
            query = query.Where(t => t.BusinessDate <= toDate);
        }

        var total = await query.CountAsync();

        var transactions = await query
            .OrderByDescending(t => t.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var items = transactions.Select(t => new TransactionListItemResponse
        {
            Id = t.Id,
            InvoiceNo = t.InvoiceNo,
            CashierName = t.Cashier.Name,
            CreatedAt = t.CreatedAt,
            BusinessDate = t.BusinessDate.ToString("yyyy-MM-dd"),
            Total = t.Total,
            PaymentMethod = t.PaymentMethod,
            ItemCount = t.Items.Count,
            Status = t.Status.ToString()
        }).ToList();

        return (items, total);
    }

    private TransactionResponse MapToTransactionResponse(Transaction transaction)
    {
        return new TransactionResponse
        {
            Id = transaction.Id,
            CashierId = transaction.CashierId,
            InvoiceNo = transaction.InvoiceNo,
            CashierName = transaction.Cashier.Name,
            CreatedAt = transaction.CreatedAt,
            BusinessDate = transaction.BusinessDate.ToString("yyyy-MM-dd"),
            Subtotal = transaction.Subtotal,
            Discount = transaction.Discount,
            Tax = transaction.Tax,
            Total = transaction.Total,
            PaymentMethod = transaction.PaymentMethod,
            PaidAmount = transaction.PaidAmount,
            ChangeAmount = transaction.ChangeAmount,
            Notes = transaction.Notes,
            Status = transaction.Status.ToString(),
            VoidedAt = transaction.VoidedAt,
            VoidedByName = transaction.VoidedBy?.Name,
            VoidReason = transaction.VoidReason,
            Items = transaction.Items.Select(i => new TransactionItemDto
            {
                Id = i.Id,
                ProductId = i.ProductId,
                ProductName = i.Product.Name,
                Qty = i.Qty,
                UnitPrice = i.UnitPrice,
                LineTotal = i.LineTotal
            }).ToList()
        };
    }
}
