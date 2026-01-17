using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WarungKopiAPI.DTOs;
using WarungKopiAPI.Services;

namespace WarungKopiAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class ProductsController : ControllerBase
{
    private readonly IProductService _productService;

    public ProductsController(IProductService productService)
    {
        _productService = productService;
    }

    /// <summary>
    /// Get products with optional filtering
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetProducts([FromQuery] string? search, [FromQuery] Guid? categoryId, [FromQuery] bool? active)
    {
        var products = await _productService.GetProductsAsync(search, categoryId, active);
        return Ok(products);
    }

    /// <summary>
    /// Get product by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetProduct(Guid id)
    {
        var product = await _productService.GetProductByIdAsync(id);

        if (product == null)
        {
            return NotFound(new { message = "Product not found" });
        }

        return Ok(product);
    }

    /// <summary>
    /// Create new product
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateProduct([FromBody] CreateProductDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest(new { message = "Product name is required" });
        }

        if (dto.Price <= 0)
        {
            return BadRequest(new { message = "Product price must be greater than 0" });
        }

        try
        {
            var product = await _productService.CreateProductAsync(dto);
            return CreatedAtAction(nameof(GetProduct), new { id = product.Id }, product);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Update product
    /// </summary>
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateProduct(Guid id, [FromBody] UpdateProductDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest(new { message = "Product name is required" });
        }

        if (dto.Price <= 0)
        {
            return BadRequest(new { message = "Product price must be greater than 0" });
        }

        try
        {
            var result = await _productService.UpdateProductAsync(id, dto);

            if (!result)
            {
                return NotFound(new { message = "Product not found" });
            }

            return NoContent();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Update product active status
    /// </summary>
    [HttpPatch("{id}/active")]
    public async Task<IActionResult> UpdateProductActive(Guid id, [FromBody] UpdateProductActiveDto dto)
    {
        var result = await _productService.UpdateProductActiveAsync(id, dto.IsActive);

        if (!result)
        {
            return NotFound(new { message = "Product not found" });
        }

        return NoContent();
    }

    /// <summary>
    /// Check if product can be deleted and get related data info
    /// </summary>
    [HttpGet("{id}/check-delete")]
    public async Task<IActionResult> CheckDelete(Guid id)
    {
        var result = await _productService.CheckDeleteAsync(id);
        return Ok(result);
    }

    /// <summary>
    /// Check if multiple products can be deleted
    /// </summary>
    [HttpPost("check-delete-batch")]
    public async Task<IActionResult> CheckDeleteBatch([FromBody] CheckDeleteBatchDto dto)
    {
        if (dto.Ids == null || !dto.Ids.Any())
        {
            return BadRequest(new { message = "No product IDs provided" });
        }

        var result = await _productService.CheckDeleteBatchAsync(dto.Ids);
        return Ok(result);
    }

    /// <summary>
    /// Delete single product
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteProduct(Guid id, [FromQuery] bool forceDelete = false)
    {
        var result = await _productService.DeleteProductAsync(id, forceDelete);

        if (!result.Success)
        {
            return NotFound(new { message = result.Message });
        }

        return Ok(new { 
            message = result.Message, 
            deletedCount = result.DeletedCount,
            deactivatedCount = result.DeactivatedCount
        });
    }

    /// <summary>
    /// Delete multiple products
    /// </summary>
    [HttpPost("delete-batch")]
    public async Task<IActionResult> DeleteProducts([FromBody] DeleteProductsDto dto)
    {
        if (dto.Ids == null || !dto.Ids.Any())
        {
            return BadRequest(new { message = "No product IDs provided" });
        }

        var result = await _productService.DeleteProductsAsync(dto.Ids, dto.ForceDelete);

        if (!result.Success)
        {
            return BadRequest(new { message = result.Message });
        }

        return Ok(new { 
            message = result.Message, 
            deletedCount = result.DeletedCount,
            deactivatedCount = result.DeactivatedCount
        });
    }
}
