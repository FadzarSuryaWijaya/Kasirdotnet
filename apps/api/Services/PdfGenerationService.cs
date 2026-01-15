using Microsoft.Playwright;
using System.Text;
using WarungKopiAPI.Data;
using WarungKopiAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace WarungKopiAPI.Services;

/// <summary>
/// Service untuk generate PDF dari Transaction Snapshot menggunakan Playwright.
/// Setiap PDF di-generate sekali dan bersifat immutable sesuai snapshot data.
/// </summary>
public class PdfGenerationService
{
    private readonly IPlaywrightBrowserApp _browserApp;
    private readonly WarungKopiDbContext _context;
    private readonly ILogger<PdfGenerationService> _logger;
    private const int MaxPdfGenerationsPerInvoice = 3;

    public PdfGenerationService(
        IPlaywrightBrowserApp browserApp,
        WarungKopiDbContext context,
        ILogger<PdfGenerationService> logger)
    {
        _browserApp = browserApp;
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Generate PDF untuk transaksi berdasarkan snapshot data.
    /// Hanya menggunakan data immutable dari TransactionSnapshot.
    /// </summary>
    public async Task<(byte[] pdfData, string fileName)> GeneratePdfAsync(Guid transactionId, string receiptWidth = "58mm")
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        
        try
        {
            _logger.LogInformation("Starting PDF generation for transaction: {TransactionId}", transactionId);

            // Ambil data transaksi dengan itemnya
            var transaction = await _context.Transactions
                .Include(t => t.Cashier)
                .Include(t => t.Items)
                .ThenInclude(ti => ti.Product)
                .FirstOrDefaultAsync(t => t.Id == transactionId);

            if (transaction == null)
            {
                throw new KeyNotFoundException($"Transaction not found for transaction {transactionId}");
            }

            // Generate HTML dari transaction data
            var htmlContent = GenerateReceiptHtmlFromTransaction(transaction, receiptWidth);

            // Generate PDF menggunakan Playwright
            var pdfData = await GeneratePdfFromHtmlAsync(htmlContent, receiptWidth);

            stopwatch.Stop();
            _logger.LogInformation(
                "PDF generated successfully for {InvoiceNo}. Size: {Size} bytes, Duration: {Duration}ms",
                transaction.InvoiceNo, pdfData.Length, stopwatch.ElapsedMilliseconds);

            var fileName = $"struk-{transaction.InvoiceNo.Replace(" ", "_")}.pdf";
            return (pdfData, fileName);
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _logger.LogError(
                ex,
                "PDF generation failed for transaction {TransactionId}. Duration: {Duration}ms",
                transactionId, stopwatch.ElapsedMilliseconds);

            throw;
        }
    }

    /// <summary>
    /// Generate HTML receipt dari Transaction object.
    /// HTML ini akan di-convert ke PDF oleh Playwright.
    /// </summary>
    private string GenerateReceiptHtmlFromTransaction(Models.Transaction transaction, string receiptWidth)
    {
        var sb = new StringBuilder();

        sb.AppendLine("<!DOCTYPE html>");
        sb.AppendLine("<html>");
        sb.AppendLine("<head>");
        sb.AppendLine("<meta charset='utf-8'/>");
        sb.AppendLine("<meta name='viewport' content='width=device-width, initial-scale=1'/>");
        sb.AppendLine("<title>Struk</title>");
        sb.AppendLine("<style>");
        sb.AppendLine("@page {");
        sb.AppendLine("  margin: 0;");
        sb.AppendLine("  padding: 0;");
        sb.AppendLine($"  size: {receiptWidth} auto;");
        sb.AppendLine("}");
        sb.AppendLine("body {");
        sb.AppendLine("  margin: 0;");
        sb.AppendLine("  padding: 8px;");
        sb.AppendLine("  font-family: 'Courier New', monospace;");
        sb.AppendLine("  font-size: 10px;");
        sb.AppendLine("  line-height: 1.4;");
        sb.AppendLine("  background: white;");
        sb.AppendLine("  color: black;");
        sb.AppendLine("}");
        sb.AppendLine(".receipt-container {");
        sb.AppendLine($"  width: {receiptWidth};");
        sb.AppendLine("  margin: 0 auto;");
        sb.AppendLine("  page-break-inside: avoid;");
        sb.AppendLine("}");
        sb.AppendLine(".header { text-align: center; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px dashed #000; }");
        sb.AppendLine(".header h2 { margin: 0; font-size: 12px; font-weight: bold; }");
        sb.AppendLine(".header p { margin: 2px 0 0 0; font-size: 9px; }");
        sb.AppendLine(".info { margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px dashed #000; font-size: 10px; }");
        sb.AppendLine(".info-row { display: flex; justify-content: space-between; margin: 2px 0; }");
        sb.AppendLine(".items { margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px dashed #000; }");
        sb.AppendLine(".item { margin-bottom: 6px; font-size: 10px; }");
        sb.AppendLine(".item-name { font-weight: bold; margin-bottom: 2px; }");
        sb.AppendLine(".item-detail { display: flex; justify-content: space-between; padding-left: 4px; font-size: 9px; }");
        sb.AppendLine(".totals { margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px dashed #000; font-size: 10px; }");
        sb.AppendLine(".total-row { display: flex; justify-content: space-between; margin: 2px 0; }");
        sb.AppendLine(".total-row.grand-total { font-weight: bold; font-size: 11px; margin-top: 4px; padding-top: 4px; border-top: 1px dotted #000; }");
        sb.AppendLine(".payment { margin-bottom: 12px; font-size: 10px; }");
        sb.AppendLine(".payment-row { display: flex; justify-content: space-between; margin: 2px 0; }");
        sb.AppendLine(".footer { text-align: center; font-size: 10px; }");
        sb.AppendLine(".footer p { margin: 4px 0; }");
        sb.AppendLine("</style>");
        sb.AppendLine("</head>");
        sb.AppendLine("<body>");
        sb.AppendLine("<div class='receipt-container'>");

        // Header
        sb.AppendLine("<div class='header'>");
        sb.AppendLine("<h2>WARUNG KOPI</h2>");
        sb.AppendLine("<p>Jl. Kopi Nikmat No. 123</p>");
        sb.AppendLine("</div>");

        // Info Transaksi
        sb.AppendLine("<div class='info'>");
        sb.AppendLine("<div class='info-row'>");
        sb.AppendLine("<span>No:</span>");
        sb.AppendLine($"<span>{transaction.InvoiceNo}</span>");
        sb.AppendLine("</div>");
        sb.AppendLine("<div class='info-row'>");
        sb.AppendLine("<span>Tgl:</span>");
        sb.AppendLine($"<span>{transaction.CreatedAt:dd/MM/yy HH:mm}</span>");
        sb.AppendLine("</div>");
        sb.AppendLine("<div class='info-row'>");
        sb.AppendLine("<span>Kasir:</span>");
        sb.AppendLine($"<span>{transaction.Cashier?.Name.ToUpper() ?? "KASIR"}</span>");
        sb.AppendLine("</div>");
        sb.AppendLine("</div>");

        // Items
        sb.AppendLine("<div class='items'>");
        foreach (var item in transaction.Items ?? new List<Models.TransactionItem>())
        {
            sb.AppendLine("<div class='item'>");
            sb.AppendLine($"<div class='item-name'>{item.Product?.Name ?? "Item"}</div>");
            sb.AppendLine("<div class='item-detail'>");
            sb.AppendLine($"<span>{item.Qty} x {item.UnitPrice:N0}</span>");
            sb.AppendLine($"<span>{item.LineTotal:N0}</span>");
            sb.AppendLine("</div>");
            sb.AppendLine("</div>");
        }
        sb.AppendLine("</div>");

        // Totals
        sb.AppendLine("<div class='totals'>");
        sb.AppendLine("<div class='total-row'>");
        sb.AppendLine("<span>Subtotal</span>");
        sb.AppendLine($"<span>{transaction.Subtotal:N0}</span>");
        sb.AppendLine("</div>");

        if (transaction.Discount > 0)
        {
            sb.AppendLine("<div class='total-row'>");
            sb.AppendLine("<span>Diskon</span>");
            sb.AppendLine($"<span>({transaction.Discount:N0})</span>");
            sb.AppendLine("</div>");
        }

        if (transaction.Tax > 0)
        {
            sb.AppendLine("<div class='total-row'>");
            sb.AppendLine("<span>Pajak</span>");
            sb.AppendLine($"<span>{transaction.Tax:N0}</span>");
            sb.AppendLine("</div>");
        }

        sb.AppendLine("<div class='total-row grand-total'>");
        sb.AppendLine("<span>TOTAL</span>");
        sb.AppendLine($"<span>Rp{transaction.Total:N0}</span>");
        sb.AppendLine("</div>");
        sb.AppendLine("</div>");

        // Payment
        sb.AppendLine("<div class='payment'>");
        sb.AppendLine("<div class='payment-row'>");
        sb.AppendLine($"<span>{transaction.PaymentMethod?.ToUpper() ?? "CASH"}</span>");
        sb.AppendLine($"<span>{transaction.PaidAmount:N0}</span>");
        sb.AppendLine("</div>");

        if (transaction.ChangeAmount > 0)
        {
            sb.AppendLine("<div class='payment-row'>");
            sb.AppendLine("<span>Kembali</span>");
            sb.AppendLine($"<span>{transaction.ChangeAmount:N0}</span>");
            sb.AppendLine("</div>");
        }
        sb.AppendLine("</div>");

        // Footer
        sb.AppendLine("<div class='footer'>");
        sb.AppendLine("<p style='font-weight: bold;'>Terima Kasih</p>");
        sb.AppendLine("<p style='font-size: 9px;'>Barang tidak dapat ditukar</p>");
        sb.AppendLine("</div>");

        sb.AppendLine("</div>");
        sb.AppendLine("</body>");
        sb.AppendLine("</html>");

        return sb.ToString();
    }

    /// <summary>
    /// Generate HTML receipt dari TransactionSnapshot.
    /// HTML ini akan di-convert ke PDF oleh Playwright.
    /// </summary>
    private string GenerateReceiptHtml(TransactionSnapshot snapshot, string receiptWidth)
    {
        var items = System.Text.Json.JsonSerializer.Deserialize<List<Models.TransactionSnapshotItem>>(
            snapshot.ItemsJson) ?? new List<Models.TransactionSnapshotItem>();

        var sb = new StringBuilder();

        sb.AppendLine("<!DOCTYPE html>");
        sb.AppendLine("<html>");
        sb.AppendLine("<head>");
        sb.AppendLine("<meta charset='utf-8'/>");
        sb.AppendLine("<meta name='viewport' content='width=device-width, initial-scale=1'/>");
        sb.AppendLine("<title>Struk</title>");
        sb.AppendLine("<style>");
        sb.AppendLine("@page {");
        sb.AppendLine("  margin: 0;");
        sb.AppendLine("  padding: 0;");
        sb.AppendLine($"  size: {receiptWidth} auto;");
        sb.AppendLine("}");
        sb.AppendLine("body {");
        sb.AppendLine("  margin: 0;");
        sb.AppendLine("  padding: 8px;");
        sb.AppendLine("  font-family: 'Courier New', monospace;");
        sb.AppendLine("  font-size: 10px;");
        sb.AppendLine("  line-height: 1.4;");
        sb.AppendLine("  background: white;");
        sb.AppendLine("  color: black;");
        sb.AppendLine("}");
        sb.AppendLine(".receipt-container {");
        sb.AppendLine($"  width: {receiptWidth};");
        sb.AppendLine("  margin: 0 auto;");
        sb.AppendLine("  page-break-inside: avoid;");
        sb.AppendLine("}");
        sb.AppendLine(".header {");
        sb.AppendLine("  text-align: center;");
        sb.AppendLine("  margin-bottom: 8px;");
        sb.AppendLine("  padding-bottom: 4px;");
        sb.AppendLine("  border-bottom: 1px dashed #000;");
        sb.AppendLine("}");
        sb.AppendLine(".header h2 {");
        sb.AppendLine("  margin: 0;");
        sb.AppendLine("  font-size: 12px;");
        sb.AppendLine("  font-weight: bold;");
        sb.AppendLine("}");
        sb.AppendLine(".header p {");
        sb.AppendLine("  margin: 2px 0 0 0;");
        sb.AppendLine("  font-size: 9px;");
        sb.AppendLine("}");
        sb.AppendLine(".info {");
        sb.AppendLine("  margin-bottom: 8px;");
        sb.AppendLine("  padding-bottom: 4px;");
        sb.AppendLine("  border-bottom: 1px dashed #000;");
        sb.AppendLine("  font-size: 10px;");
        sb.AppendLine("}");
        sb.AppendLine(".info-row {");
        sb.AppendLine("  display: flex;");
        sb.AppendLine("  justify-content: space-between;");
        sb.AppendLine("  margin: 2px 0;");
        sb.AppendLine("}");
        sb.AppendLine(".items {");
        sb.AppendLine("  margin-bottom: 8px;");
        sb.AppendLine("  padding-bottom: 4px;");
        sb.AppendLine("  border-bottom: 1px dashed #000;");
        sb.AppendLine("}");
        sb.AppendLine(".item {");
        sb.AppendLine("  margin-bottom: 6px;");
        sb.AppendLine("  font-size: 10px;");
        sb.AppendLine("}");
        sb.AppendLine(".item-name {");
        sb.AppendLine("  font-weight: bold;");
        sb.AppendLine("  margin-bottom: 2px;");
        sb.AppendLine("}");
        sb.AppendLine(".item-detail {");
        sb.AppendLine("  display: flex;");
        sb.AppendLine("  justify-content: space-between;");
        sb.AppendLine("  padding-left: 4px;");
        sb.AppendLine("  font-size: 9px;");
        sb.AppendLine("}");
        sb.AppendLine(".totals {");
        sb.AppendLine("  margin-bottom: 8px;");
        sb.AppendLine("  padding-bottom: 4px;");
        sb.AppendLine("  border-bottom: 1px dashed #000;");
        sb.AppendLine("  font-size: 10px;");
        sb.AppendLine("}");
        sb.AppendLine(".total-row {");
        sb.AppendLine("  display: flex;");
        sb.AppendLine("  justify-content: space-between;");
        sb.AppendLine("  margin: 2px 0;");
        sb.AppendLine("}");
        sb.AppendLine(".total-row.grand-total {");
        sb.AppendLine("  font-weight: bold;");
        sb.AppendLine("  font-size: 11px;");
        sb.AppendLine("  margin-top: 4px;");
        sb.AppendLine("  padding-top: 4px;");
        sb.AppendLine("  border-top: 1px dotted #000;");
        sb.AppendLine("}");
        sb.AppendLine(".payment {");
        sb.AppendLine("  margin-bottom: 12px;");
        sb.AppendLine("  font-size: 10px;");
        sb.AppendLine("}");
        sb.AppendLine(".payment-row {");
        sb.AppendLine("  display: flex;");
        sb.AppendLine("  justify-content: space-between;");
        sb.AppendLine("  margin: 2px 0;");
        sb.AppendLine("}");
        sb.AppendLine(".footer {");
        sb.AppendLine("  text-align: center;");
        sb.AppendLine("  font-size: 10px;");
        sb.AppendLine("}");
        sb.AppendLine(".footer p {");
        sb.AppendLine("  margin: 4px 0;");
        sb.AppendLine("}");
        sb.AppendLine("</style>");
        sb.AppendLine("</head>");
        sb.AppendLine("<body>");
        sb.AppendLine("<div class='receipt-container'>");

        // Header
        sb.AppendLine("<div class='header'>");
        sb.AppendLine($"<h2>{snapshot.StoreName}</h2>");
        sb.AppendLine($"<p>{snapshot.StoreAddress}</p>");
        sb.AppendLine("</div>");

        // Info Transaksi
        sb.AppendLine("<div class='info'>");
        sb.AppendLine("<div class='info-row'>");
        sb.AppendLine("<span>No:</span>");
        sb.AppendLine($"<span>{snapshot.InvoiceNo}</span>");
        sb.AppendLine("</div>");
        sb.AppendLine("<div class='info-row'>");
        sb.AppendLine("<span>Tgl:</span>");
        sb.AppendLine($"<span>{snapshot.CreatedAtUtc:dd/MM/yy HH:mm}</span>");
        sb.AppendLine("</div>");
        sb.AppendLine("<div class='info-row'>");
        sb.AppendLine("<span>Kasir:</span>");
        sb.AppendLine($"<span>{snapshot.CashierName.ToUpper()}</span>");
        sb.AppendLine("</div>");
        sb.AppendLine("</div>");

        // Items
        sb.AppendLine("<div class='items'>");
        foreach (var item in items)
        {
            sb.AppendLine("<div class='item'>");
            sb.AppendLine($"<div class='item-name'>{item.ProductName}</div>");
            sb.AppendLine("<div class='item-detail'>");
            sb.AppendLine($"<span>{item.Qty} x {item.UnitPrice:N0}</span>");
            sb.AppendLine($"<span>{item.LineTotal:N0}</span>");
            sb.AppendLine("</div>");
            sb.AppendLine("</div>");
        }
        sb.AppendLine("</div>");

        // Totals
        sb.AppendLine("<div class='totals'>");
        sb.AppendLine("<div class='total-row'>");
        sb.AppendLine("<span>Subtotal</span>");
        sb.AppendLine($"<span>{snapshot.Subtotal:N0}</span>");
        sb.AppendLine("</div>");

        if (snapshot.Discount > 0)
        {
            sb.AppendLine("<div class='total-row'>");
            sb.AppendLine("<span>Diskon</span>");
            sb.AppendLine($"<span>({snapshot.Discount:N0})</span>");
            sb.AppendLine("</div>");
        }

        if (snapshot.Tax > 0)
        {
            sb.AppendLine("<div class='total-row'>");
            sb.AppendLine("<span>Pajak</span>");
            sb.AppendLine($"<span>{snapshot.Tax:N0}</span>");
            sb.AppendLine("</div>");
        }

        sb.AppendLine("<div class='total-row grand-total'>");
        sb.AppendLine("<span>TOTAL</span>");
        sb.AppendLine($"<span>Rp{snapshot.Total:N0}</span>");
        sb.AppendLine("</div>");
        sb.AppendLine("</div>");

        // Payment
        sb.AppendLine("<div class='payment'>");
        sb.AppendLine("<div class='payment-row'>");
        sb.AppendLine($"<span>{snapshot.PaymentMethod.ToUpper()}</span>");
        sb.AppendLine($"<span>{snapshot.PaidAmount:N0}</span>");
        sb.AppendLine("</div>");

        if (snapshot.ChangeAmount > 0)
        {
            sb.AppendLine("<div class='payment-row'>");
            sb.AppendLine("<span>Kembali</span>");
            sb.AppendLine($"<span>{snapshot.ChangeAmount:N0}</span>");
            sb.AppendLine("</div>");
        }
        sb.AppendLine("</div>");

        // Footer
        sb.AppendLine("<div class='footer'>");
        sb.AppendLine("<p style='font-weight: bold;'>Terima Kasih</p>");
        sb.AppendLine("<p style='font-size: 9px;'>Barang tidak dapat ditukar</p>");
        sb.AppendLine("</div>");

        sb.AppendLine("</div>");
        sb.AppendLine("</body>");
        sb.AppendLine("</html>");

        return sb.ToString();
    }

    /// <summary>
    /// Generate PDF dari HTML menggunakan Playwright.
    /// Memastikan output hanya 1 halaman dengan ukuran 58mm atau 80mm.
    /// </summary>
    private async Task<byte[]> GeneratePdfFromHtmlAsync(string htmlContent, string receiptWidth)
    {
        var browser = await _browserApp.GetBrowserAsync();
        var context = await browser.NewContextAsync();
        var page = await context.NewPageAsync();

        try
        {
            // Set content
            await page.SetContentAsync(htmlContent);

            // Generate PDF dengan settings optimal untuk thermal receipt
            var pdfOptions = new PagePdfOptions
            {
                PrintBackground = true,
                Landscape = false,
                Margin = new() { Top = "0", Bottom = "0", Left = "0", Right = "0" }
            };

            // Set page size sesuai receipt width
            if (receiptWidth == "80mm")
            {
                pdfOptions.Format = "A4"; // Default untuk 80mm
            }
            else // 58mm (default)
            {
                pdfOptions.Format = "A4"; // Akan di-scale oleh page CSS
            }

            var pdfData = await page.PdfAsync(pdfOptions);

            return pdfData;
        }
        finally
        {
            await page.CloseAsync();
            await context.CloseAsync();
        }
    }
}

/// <summary>
/// Interface untuk Playwright Browser initialization
/// </summary>
public interface IPlaywrightBrowserApp
{
    Task<IBrowser> GetBrowserAsync();
}

/// <summary>
/// Implementation Playwright Browser dengan lazy initialization
/// </summary>
public class PlaywrightBrowserApp : IPlaywrightBrowserApp
{
    private IBrowser? _browser;
    private readonly ILogger<PlaywrightBrowserApp> _logger;
    private readonly object _lockObject = new();

    public PlaywrightBrowserApp(ILogger<PlaywrightBrowserApp> logger)
    {
        _logger = logger;
    }

    public async Task<IBrowser> GetBrowserAsync()
    {
        if (_browser != null && _browser.IsConnected)
        {
            return _browser;
        }

        lock (_lockObject)
        {
            if (_browser != null && _browser.IsConnected)
            {
                return _browser;
            }

            _logger.LogInformation("Initializing Playwright browser");
            var playwright = Playwright.CreateAsync().GetAwaiter().GetResult();
            _browser = playwright.Chromium.LaunchAsync(new() { Headless = true })
                .GetAwaiter().GetResult();
            _logger.LogInformation("Playwright browser initialized");

            return _browser;
        }
    }
}
