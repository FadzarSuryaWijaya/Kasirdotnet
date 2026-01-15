using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using WarungKopiAPI.DTOs;
using WarungKopiAPI.Services;

namespace WarungKopiAPI.Controllers;

[ApiController]
[Route("api/transactions/{id}/pdf")]
[Authorize(Roles = "Admin,Kasir")]
public class TransactionPdfController : ControllerBase
{
    private readonly PdfGenerationService _pdfService;
    private readonly ILogger<TransactionPdfController> _logger;

    public TransactionPdfController(
        PdfGenerationService pdfService,
        ILogger<TransactionPdfController> logger)
    {
        _pdfService = pdfService;
        _logger = logger;
    }

    /// <summary>
    /// Generate dan download PDF struk transaksi
    /// GET /api/transactions/{id}/pdf?receiptWidth=58mm
    /// </summary>
    /// <param name="id">Transaction ID</param>
    /// <param name="receiptWidth">Receipt width: 58mm (default) atau 80mm</param>
    [HttpGet]
    public async Task<IActionResult> GetTransactionPdf(
        Guid id,
        [FromQuery] string receiptWidth = "58mm")
    {
        try
        {
            // AUTHENTICATION CHECK - explicit validation
            // [Authorize] attribute sudah check token, tapi kita validate claim juga
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            _logger.LogInformation(
                "PDF request from user {UserId} ({Role}) for transaction {TransactionId}", 
                userIdStr, userRole, id);

            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
            {
                _logger.LogWarning("Invalid or missing token claims for transaction {TransactionId}", id);
                return Unauthorized(new PdfGenerationError
                {
                    Code = 401,
                    Message = "Invalid token or missing claims",
                    Details = "Token tidak valid atau klaim (NameIdentifier) tidak ditemukan"
                });
            }

            if (string.IsNullOrEmpty(userRole))
            {
                _logger.LogWarning("Missing role claim for user {UserId}", userIdStr);
                return Unauthorized(new PdfGenerationError
                {
                    Code = 401,
                    Message = "Missing role authorization",
                    Details = "Peran pengguna tidak ditemukan dalam token"
                });
            }

            // Validate receiptWidth
            if (receiptWidth != "58mm" && receiptWidth != "80mm")
            {
                receiptWidth = "58mm";
            }

            // Generate PDF menggunakan service
            var (pdfData, fileName) = await _pdfService.GeneratePdfAsync(id, receiptWidth);

            // Return PDF sebagai file download dengan cache headers
            Response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
            Response.Headers["Pragma"] = "no-cache";
            Response.Headers["Expires"] = "0";

            return File(pdfData, "application/pdf", fileName);
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning("Transaction not found: {TransactionId}", id);
            return StatusCode(404, new PdfGenerationError
            {
                Code = 404,
                Message = "Transaksi tidak ditemukan",
                Details = ex.Message
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("PDF generation limit reached: {Message}", ex.Message);
            return StatusCode(429, new PdfGenerationError
            {
                Code = 429,
                Message = "Batas generasi PDF tercapai",
                Details = ex.Message
            });
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning("Unauthorized PDF access attempt: {Message}", ex.Message);
            return StatusCode(403, new PdfGenerationError
            {
                Code = 403,
                Message = "Anda tidak memiliki akses ke transaksi ini",
                Details = ex.Message
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating PDF for transaction {TransactionId}", id);
            return StatusCode(500, new PdfGenerationError
            {
                Code = 500,
                Message = "Gagal membuat PDF",
                Details = ex.Message
            });
        }
    }
}
