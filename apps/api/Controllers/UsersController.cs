using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using WarungKopiAPI.Data;
using WarungKopiAPI.DTOs;
using WarungKopiAPI.Models;
using WarungKopiAPI.Services;

namespace WarungKopiAPI.Controllers;

[ApiController]
[Route("api/users")]
[Authorize(Roles = "Admin")]
public class UsersController : ControllerBase
{
    private readonly WarungKopiDbContext _context;
    private readonly AuditService _auditService;

    public UsersController(WarungKopiDbContext context, AuditService auditService)
    {
        _context = context;
        _auditService = auditService;
    }

    private Guid GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(claim, out var id) ? id : Guid.Empty;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? role = null)
    {
        var query = _context.Users.AsNoTracking().AsQueryable();
        
        if (!string.IsNullOrEmpty(role))
            query = query.Where(u => u.Role == role);

        var users = await query
            .OrderBy(u => u.Name)
            .Select(u => new UserResponse
            {
                Id = u.Id.ToString(),
                Name = u.Name,
                Username = u.Username,
                Role = u.Role,
                IsActive = u.IsActive,
                CreatedAt = u.CreatedAt
            })
            .ToListAsync();

        return Ok(users);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        if (!Guid.TryParse(id, out var userId))
            return BadRequest(new { message = "Invalid ID" });

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            return NotFound(new { message = "User not found" });

        return Ok(new UserResponse
        {
            Id = user.Id.ToString(),
            Name = user.Name,
            Username = user.Username,
            Role = user.Role,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateUserRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { message = "Name, username, and password are required" });

        if (request.Role != "Admin" && request.Role != "Kasir")
            return BadRequest(new { message = "Role must be Admin or Kasir" });

        // Check if username exists
        var exists = await _context.Users.AnyAsync(u => u.Username == request.Username);
        if (exists)
            return BadRequest(new { message = "Username sudah digunakan" });

        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Username = request.Username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = request.Role,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = user.Id }, new UserResponse
        {
            Id = user.Id.ToString(),
            Name = user.Name,
            Username = user.Username,
            Role = user.Role,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateUserRequest request)
    {
        if (!Guid.TryParse(id, out var userId))
            return BadRequest(new { message = "Invalid ID" });

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            return NotFound(new { message = "User not found" });

        if (request.Role != "Admin" && request.Role != "Kasir")
            return BadRequest(new { message = "Role must be Admin or Kasir" });

        user.Name = request.Name;
        user.Role = request.Role;
        user.IsActive = request.IsActive;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new UserResponse
        {
            Id = user.Id.ToString(),
            Name = user.Name,
            Username = user.Username,
            Role = user.Role,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt
        });
    }

    [HttpPost("{id}/reset-password")]
    public async Task<IActionResult> ResetPassword(string id, [FromBody] ResetPasswordRequest request)
    {
        if (!Guid.TryParse(id, out var userId))
            return BadRequest(new { message = "Invalid ID" });

        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 4)
            return BadRequest(new { message = "Password minimal 4 karakter" });

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            return NotFound(new { message = "User not found" });

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Audit log
        await _auditService.LogAsync(
            AuditAction.PasswordReset,
            GetUserId(),
            "User",
            userId.ToString(),
            $"Reset password untuk user: {user.Name}"
        );

        return Ok(new { message = "Password berhasil direset" });
    }

    [HttpPatch("{id}/toggle-active")]
    public async Task<IActionResult> ToggleActive(string id)
    {
        if (!Guid.TryParse(id, out var userId))
            return BadRequest(new { message = "Invalid ID" });

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            return NotFound(new { message = "User not found" });

        user.IsActive = !user.IsActive;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new { message = user.IsActive ? "User diaktifkan" : "User dinonaktifkan", isActive = user.IsActive });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        if (!Guid.TryParse(id, out var userId))
            return BadRequest(new { message = "Invalid ID" });

        var currentUserId = GetUserId();
        if (userId == currentUserId)
            return BadRequest(new { message = "Tidak bisa menghapus diri sendiri" });

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            return NotFound(new { message = "User not found" });

        // Check if user has active sessions
        var activeSessions = await _context.CashierSessions
            .AnyAsync(s => s.CashierId == userId && s.Status == SessionStatus.Open);
        
        if (activeSessions)
            return BadRequest(new { message = "Tidak bisa menghapus user yang memiliki shift aktif" });

        // Audit log before deletion
        await _auditService.LogAsync(
            AuditAction.UserDeleted,
            currentUserId,
            "User",
            userId.ToString(),
            $"Menghapus user: {user.Name} ({user.Username})"
        );

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();

        return Ok(new { message = "User berhasil dihapus" });
    }
}
