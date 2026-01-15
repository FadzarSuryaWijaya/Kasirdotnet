using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WarungKopiAPI.DTOs;
using WarungKopiAPI.Services;
using System.Security.Claims;

namespace WarungKopiAPI.Controllers;

[ApiController]
[Route("api/pos")]
[Authorize(Roles = "Admin,Kasir")]
public class PosController : ControllerBase
{
    private readonly IProductService _productService;

    public PosController(IProductService productService)
    {
        _productService = productService;
    }

    /// <summary>
    /// Get active products for POS
    /// </summary>
    [HttpGet("products")]
    public async Task<IActionResult> GetProducts(
        [FromQuery] string? search = null,
        [FromQuery] Guid? categoryId = null)
    {
        try
        {
            var products = await _productService.GetProductsAsync(search, categoryId, true);
            return Ok(products);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
