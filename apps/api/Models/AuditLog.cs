namespace WarungKopiAPI.Models;

public enum AuditAction
{
    // User actions
    UserCreated = 0,
    UserUpdated = 1,
    UserDeleted = 2,
    PasswordReset = 3,
    UserLogin = 4,
    UserLogout = 5,
    
    // Transaction actions
    TransactionCreated = 10,
    TransactionVoided = 11,
    
    // Stock actions
    StockRestock = 20,
    StockAdjust = 21,
    StockSet = 22,
    
    // Cash actions
    CashDeposit = 30,
    CashWithdraw = 31,
    CashAdjust = 32,
    CashSet = 33,
    
    // Session actions
    SessionStart = 40,
    SessionEnd = 41,
    
    // Daily closure
    DayClosed = 50,
    DayReopened = 51,
    
    // Product/Category
    ProductCreated = 60,
    ProductUpdated = 61,
    ProductDeleted = 62,
    CategoryCreated = 70,
    CategoryUpdated = 71,
    CategoryDeleted = 72
}

public class AuditLog
{
    public Guid Id { get; set; }
    public AuditAction Action { get; set; }
    public string ActionName { get; set; } = string.Empty;
    public string? EntityType { get; set; } // Transaction, User, Product, etc
    public string? EntityId { get; set; }
    public string? Description { get; set; }
    public string? OldValue { get; set; } // JSON of old state
    public string? NewValue { get; set; } // JSON of new state
    public Guid? UserId { get; set; }
    public User? User { get; set; }
    public string? IpAddress { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
