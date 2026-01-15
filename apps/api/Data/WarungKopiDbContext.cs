using Microsoft.EntityFrameworkCore;
using WarungKopiAPI.Models;

namespace WarungKopiAPI.Data;

public class WarungKopiDbContext : DbContext
{
    public WarungKopiDbContext(DbContextOptions<WarungKopiDbContext> options) : base(options) { }

    public DbSet<User> Users { get; set; }
    public DbSet<Category> Categories { get; set; }
    public DbSet<Product> Products { get; set; }
    public DbSet<Transaction> Transactions { get; set; }
    public DbSet<TransactionItem> TransactionItems { get; set; }
    public DbSet<HeldOrder> HeldOrders { get; set; }
    public DbSet<DailyClosure> DailyClosures { get; set; }
    public DbSet<CashierSession> CashierSessions { get; set; }
    public DbSet<StockHistory> StockHistories { get; set; }
    public DbSet<CashDrawerBalance> CashDrawerBalances { get; set; }
    public DbSet<CashDrawerHistory> CashDrawerHistories { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; }
    public DbSet<StoreSetting> StoreSettings { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User configuration
        modelBuilder.Entity<User>()
            .HasKey(u => u.Id);
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Username)
            .IsUnique();
        modelBuilder.Entity<User>()
            .Property(u => u.Name)
            .HasMaxLength(255)
            .IsRequired();
        modelBuilder.Entity<User>()
            .Property(u => u.Username)
            .HasMaxLength(100)
            .IsRequired();
        modelBuilder.Entity<User>()
            .Property(u => u.PasswordHash)
            .IsRequired();
        modelBuilder.Entity<User>()
            .Property(u => u.Role)
            .HasMaxLength(50)
            .IsRequired();

        // Category configuration
        modelBuilder.Entity<Category>()
            .HasKey(c => c.Id);
        modelBuilder.Entity<Category>()
            .Property(c => c.Name)
            .HasMaxLength(255)
            .IsRequired();
        modelBuilder.Entity<Category>()
            .HasMany(c => c.Products)
            .WithOne(p => p.Category)
            .HasForeignKey(p => p.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        // Product configuration
        modelBuilder.Entity<Product>()
            .HasKey(p => p.Id);
        modelBuilder.Entity<Product>()
            .Property(p => p.Name)
            .HasMaxLength(255)
            .IsRequired();
        modelBuilder.Entity<Product>()
            .Property(p => p.Price)
            .HasPrecision(18, 2);
        modelBuilder.Entity<Product>()
            .HasOne(p => p.Category)
            .WithMany(c => c.Products)
            .HasForeignKey(p => p.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        // Transaction configuration
        modelBuilder.Entity<Transaction>()
            .HasKey(t => t.Id);
        modelBuilder.Entity<Transaction>()
            .Property(t => t.InvoiceNo)
            .HasMaxLength(50)
            .IsRequired();
        modelBuilder.Entity<Transaction>()
            .HasIndex(t => t.InvoiceNo)
            .IsUnique();
        modelBuilder.Entity<Transaction>()
            .Property(t => t.Subtotal)
            .HasPrecision(18, 2);
        modelBuilder.Entity<Transaction>()
            .Property(t => t.Discount)
            .HasPrecision(18, 2);
        modelBuilder.Entity<Transaction>()
            .Property(t => t.Tax)
            .HasPrecision(18, 2);
        modelBuilder.Entity<Transaction>()
            .Property(t => t.Total)
            .HasPrecision(18, 2);
        modelBuilder.Entity<Transaction>()
            .Property(t => t.PaidAmount)
            .HasPrecision(18, 2);
        modelBuilder.Entity<Transaction>()
            .Property(t => t.ChangeAmount)
            .HasPrecision(18, 2);
        modelBuilder.Entity<Transaction>()
            .HasOne(t => t.Cashier)
            .WithMany()
            .HasForeignKey(t => t.CashierId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Transaction>()
            .HasMany(t => t.Items)
            .WithOne(i => i.Transaction)
            .HasForeignKey(i => i.TransactionId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<Transaction>()
            .HasOne(t => t.VoidedBy)
            .WithMany()
            .HasForeignKey(t => t.VoidedById)
            .OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<Transaction>()
            .Property(t => t.VoidReason)
            .HasMaxLength(500);
        modelBuilder.Entity<Transaction>()
            .HasIndex(t => t.BusinessDate); // Index for efficient date-based queries

        // TransactionItem configuration
        modelBuilder.Entity<TransactionItem>()
            .HasKey(ti => ti.Id);
        modelBuilder.Entity<TransactionItem>()
            .Property(ti => ti.UnitPrice)
            .HasPrecision(18, 2);
        modelBuilder.Entity<TransactionItem>()
            .Property(ti => ti.LineTotal)
            .HasPrecision(18, 2);
        modelBuilder.Entity<TransactionItem>()
            .HasOne(ti => ti.Transaction)
            .WithMany(t => t.Items)
            .HasForeignKey(ti => ti.TransactionId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<TransactionItem>()
            .HasOne(ti => ti.Product)
            .WithMany()
            .HasForeignKey(ti => ti.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        // HeldOrder configuration
        modelBuilder.Entity<HeldOrder>()
            .HasKey(h => h.Id);
        modelBuilder.Entity<HeldOrder>()
            .Property(h => h.CustomerName)
            .HasMaxLength(255);
        modelBuilder.Entity<HeldOrder>()
            .Property(h => h.DiscountType)
            .HasMaxLength(20);
        modelBuilder.Entity<HeldOrder>()
            .Property(h => h.Discount)
            .HasPrecision(18, 2);
        modelBuilder.Entity<HeldOrder>()
            .HasOne(h => h.Cashier)
            .WithMany()
            .HasForeignKey(h => h.CashierId)
            .OnDelete(DeleteBehavior.Restrict);

        // DailyClosure configuration
        modelBuilder.Entity<DailyClosure>()
            .HasKey(d => d.Id);
        modelBuilder.Entity<DailyClosure>()
            .HasIndex(d => d.Date)
            .IsUnique();
        modelBuilder.Entity<DailyClosure>()
            .Property(d => d.SystemCashTotal)
            .HasPrecision(18, 2);
        modelBuilder.Entity<DailyClosure>()
            .Property(d => d.SystemQrisTotal)
            .HasPrecision(18, 2);
        modelBuilder.Entity<DailyClosure>()
            .Property(d => d.SystemTotalSales)
            .HasPrecision(18, 2);
        modelBuilder.Entity<DailyClosure>()
            .Property(d => d.PhysicalCashCount)
            .HasPrecision(18, 2);
        modelBuilder.Entity<DailyClosure>()
            .Property(d => d.CashDifference)
            .HasPrecision(18, 2);
        modelBuilder.Entity<DailyClosure>()
            .HasOne(d => d.ClosedBy)
            .WithMany()
            .HasForeignKey(d => d.ClosedById)
            .OnDelete(DeleteBehavior.Restrict);

        // CashierSession configuration
        modelBuilder.Entity<CashierSession>()
            .HasKey(s => s.Id);
        modelBuilder.Entity<CashierSession>()
            .Property(s => s.OpeningCash)
            .HasPrecision(18, 2);
        modelBuilder.Entity<CashierSession>()
            .Property(s => s.ClosingCash)
            .HasPrecision(18, 2);
        modelBuilder.Entity<CashierSession>()
            .Property(s => s.ExpectedCash)
            .HasPrecision(18, 2);
        modelBuilder.Entity<CashierSession>()
            .Property(s => s.Difference)
            .HasPrecision(18, 2);
        modelBuilder.Entity<CashierSession>()
            .Property(s => s.TotalSales)
            .HasPrecision(18, 2);
        modelBuilder.Entity<CashierSession>()
            .Property(s => s.TotalCash)
            .HasPrecision(18, 2);
        modelBuilder.Entity<CashierSession>()
            .Property(s => s.TotalNonCash)
            .HasPrecision(18, 2);
        modelBuilder.Entity<CashierSession>()
            .HasOne(s => s.Cashier)
            .WithMany()
            .HasForeignKey(s => s.CashierId)
            .OnDelete(DeleteBehavior.Restrict);

        // StockHistory configuration
        modelBuilder.Entity<StockHistory>()
            .HasKey(sh => sh.Id);
        modelBuilder.Entity<StockHistory>()
            .HasOne(sh => sh.Product)
            .WithMany()
            .HasForeignKey(sh => sh.ProductId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<StockHistory>()
            .HasOne(sh => sh.User)
            .WithMany()
            .HasForeignKey(sh => sh.UserId)
            .OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<StockHistory>()
            .HasIndex(sh => sh.ProductId);
        modelBuilder.Entity<StockHistory>()
            .HasIndex(sh => sh.CreatedAt);

        // CashDrawerBalance configuration
        modelBuilder.Entity<CashDrawerBalance>()
            .HasKey(c => c.Id);
        modelBuilder.Entity<CashDrawerBalance>()
            .Property(c => c.CurrentBalance)
            .HasPrecision(18, 2);

        // CashDrawerHistory configuration
        modelBuilder.Entity<CashDrawerHistory>()
            .HasKey(c => c.Id);
        modelBuilder.Entity<CashDrawerHistory>()
            .Property(c => c.Amount)
            .HasPrecision(18, 2);
        modelBuilder.Entity<CashDrawerHistory>()
            .Property(c => c.BalanceBefore)
            .HasPrecision(18, 2);
        modelBuilder.Entity<CashDrawerHistory>()
            .Property(c => c.BalanceAfter)
            .HasPrecision(18, 2);
        modelBuilder.Entity<CashDrawerHistory>()
            .HasOne(c => c.User)
            .WithMany()
            .HasForeignKey(c => c.UserId)
            .OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<CashDrawerHistory>()
            .HasIndex(c => c.CreatedAt);

        // AuditLog configuration
        modelBuilder.Entity<AuditLog>()
            .HasKey(a => a.Id);
        modelBuilder.Entity<AuditLog>()
            .HasOne(a => a.User)
            .WithMany()
            .HasForeignKey(a => a.UserId)
            .OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<AuditLog>()
            .HasIndex(a => a.CreatedAt);
        modelBuilder.Entity<AuditLog>()
            .HasIndex(a => a.Action);

        // StoreSetting configuration
        modelBuilder.Entity<StoreSetting>()
            .HasKey(s => s.Id);
        modelBuilder.Entity<StoreSetting>()
            .HasIndex(s => s.Key)
            .IsUnique();

        // TransactionSnapshot configuration - Temporarily disabled
        /*
        modelBuilder.Entity<TransactionSnapshot>()
            .HasKey(ts => ts.Id);
        modelBuilder.Entity<TransactionSnapshot>()
            .HasIndex(ts => ts.TransactionId)
            .IsUnique();
        modelBuilder.Entity<TransactionSnapshot>()
            .HasOne(ts => ts.Transaction)
            .WithOne()
            .HasForeignKey<TransactionSnapshot>(ts => ts.TransactionId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<TransactionSnapshot>()
            .Property(ts => ts.Subtotal)
            .HasPrecision(18, 2);
        modelBuilder.Entity<TransactionSnapshot>()
            .Property(ts => ts.Discount)
            .HasPrecision(18, 2);
        modelBuilder.Entity<TransactionSnapshot>()
            .Property(ts => ts.Tax)
            .HasPrecision(18, 2);
        modelBuilder.Entity<TransactionSnapshot>()
            .Property(ts => ts.Total)
            .HasPrecision(18, 2);
        modelBuilder.Entity<TransactionSnapshot>()
            .Property(ts => ts.PaidAmount)
            .HasPrecision(18, 2);
        modelBuilder.Entity<TransactionSnapshot>()
            .Property(ts => ts.ChangeAmount)
            .HasPrecision(18, 2);
        */
    }
}
