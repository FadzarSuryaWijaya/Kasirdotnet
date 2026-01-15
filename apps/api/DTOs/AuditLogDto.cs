namespace WarungKopiAPI.DTOs;

public class AuditLogResponse
{
    public string Id { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string ActionName { get; set; } = string.Empty;
    public string? EntityType { get; set; }
    public string? EntityId { get; set; }
    public string? Description { get; set; }
    public string? UserName { get; set; }
    public DateTime CreatedAt { get; set; }
}
