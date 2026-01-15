namespace WarungKopiAPI.DTOs;

public class TransactionPdfResponse
{
    public Guid Id { get; set; }
    public string InvoiceNo { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = "application/pdf";
    public int FileSizeBytes { get; set; }
    public DateTime GeneratedAtUtc { get; set; }
    public string Message { get; set; } = "PDF generated successfully";
}

public class PdfGenerationError
{
    public int Code { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? Details { get; set; }
}
