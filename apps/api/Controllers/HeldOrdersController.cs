using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;
using WarungKopiAPI.Data;
using WarungKopiAPI.DTOs;
using WarungKopiAPI.Models;

namespace WarungKopiAPI.Controllers;

[ApiController]
[Route("api/held-orders")]
[Authorize]
public class HeldOrdersController : ControllerBase
{
    private readonly WarungKopiDbContext _context;

    public HeldOrdersController(WarungKopiDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Get all held orders for the current cashier
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetHeldOrders()
    {
        try
        {
            var userId = GetCurrentUserId();
            
            var heldOrders = await _context.HeldOrders
                .AsNoTracking()
                .Include(h => h.Cashier)
                .Where(h => h.CashierId == userId)
                .OrderByDescending(h => h.CreatedAt)
                .ToListAsync();

            var response = heldOrders.Select(h => MapToResponse(h)).ToList();
            return Ok(response);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    /// <summary>
    /// Create a new held order (park current cart)
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateHeldOrder([FromBody] CreateHeldOrderRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();

            if (request.Items == null || request.Items.Count == 0)
                return BadRequest(new { message = "Cart cannot be empty" });

            var heldOrder = new HeldOrder
            {
                Id = Guid.NewGuid(),
                CashierId = userId,
                CustomerName = request.CustomerName,
                Notes = request.Notes,
                CartJson = JsonSerializer.Serialize(request.Items),
                Discount = request.Discount,
                DiscountType = request.DiscountType,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.HeldOrders.Add(heldOrder);
            await _context.SaveChangesAsync();

            // Reload with cashier info
            var savedOrder = await _context.HeldOrders
                .Include(h => h.Cashier)
                .FirstAsync(h => h.Id == heldOrder.Id);

            return Ok(MapToResponse(savedOrder));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    /// <summary>
    /// Get a specific held order by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetHeldOrder(Guid id)
    {
        try
        {
            var userId = GetCurrentUserId();
            
            var heldOrder = await _context.HeldOrders
                .AsNoTracking()
                .Include(h => h.Cashier)
                .FirstOrDefaultAsync(h => h.Id == id && h.CashierId == userId);

            if (heldOrder == null)
                return NotFound(new { message = "Held order not found" });

            return Ok(MapToResponse(heldOrder));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    /// <summary>
    /// Delete a held order (after resuming or canceling)
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteHeldOrder(Guid id)
    {
        try
        {
            var userId = GetCurrentUserId();
            
            var heldOrder = await _context.HeldOrders
                .FirstOrDefaultAsync(h => h.Id == id && h.CashierId == userId);

            if (heldOrder == null)
                return NotFound(new { message = "Held order not found" });

            _context.HeldOrders.Remove(heldOrder);
            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(userIdClaim!);
    }

    private HeldOrderResponse MapToResponse(HeldOrder heldOrder)
    {
        var items = JsonSerializer.Deserialize<List<HeldOrderCartItem>>(heldOrder.CartJson) 
            ?? new List<HeldOrderCartItem>();
        
        var subtotal = items.Sum(i => i.Price * i.Qty);

        return new HeldOrderResponse
        {
            Id = heldOrder.Id,
            CashierId = heldOrder.CashierId,
            CashierName = heldOrder.Cashier?.Name ?? "Unknown",
            CustomerName = heldOrder.CustomerName,
            Notes = heldOrder.Notes,
            Items = items,
            Discount = heldOrder.Discount,
            DiscountType = heldOrder.DiscountType,
            Subtotal = subtotal,
            CreatedAt = heldOrder.CreatedAt
        };
    }
}
