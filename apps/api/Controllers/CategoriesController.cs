using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WarungKopiAPI.DTOs;
using WarungKopiAPI.Services;

namespace WarungKopiAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class CategoriesController : ControllerBase
{
    private readonly ICategoryService _categoryService;

    public CategoriesController(ICategoryService categoryService)
    {
        _categoryService = categoryService;
    }

    /// <summary>
    /// Get all active categories
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetCategories()
    {
        var categories = await _categoryService.GetAllCategoriesAsync();
        return Ok(categories);
    }

    /// <summary>
    /// Get category by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetCategory(Guid id)
    {
        var category = await _categoryService.GetCategoryByIdAsync(id);

        if (category == null)
        {
            return NotFound(new { message = "Category not found" });
        }

        return Ok(category);
    }

    /// <summary>
    /// Create new category
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateCategory([FromBody] CreateCategoryDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest(new { message = "Category name is required" });
        }

        try
        {
            var category = await _categoryService.CreateCategoryAsync(dto);
            return CreatedAtAction(nameof(GetCategory), new { id = category.Id }, category);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Update category
    /// </summary>
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCategory(Guid id, [FromBody] CreateCategoryDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest(new { message = "Category name is required" });
        }

        try
        {
            var result = await _categoryService.UpdateCategoryAsync(id, dto);

            if (!result)
            {
                return NotFound(new { message = "Category not found" });
            }

            return NoContent();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Check if category can be deleted and get related data info
    /// </summary>
    [HttpGet("{id}/check-delete")]
    public async Task<IActionResult> CheckDelete(Guid id)
    {
        var result = await _categoryService.CheckDeleteAsync(id);
        return Ok(result);
    }

    /// <summary>
    /// Check if multiple categories can be deleted
    /// </summary>
    [HttpPost("check-delete-batch")]
    public async Task<IActionResult> CheckDeleteBatch([FromBody] CheckDeleteBatchDto dto)
    {
        if (dto.Ids == null || !dto.Ids.Any())
        {
            return BadRequest(new { message = "No category IDs provided" });
        }

        var result = await _categoryService.CheckDeleteBatchAsync(dto.Ids);
        return Ok(result);
    }

    /// <summary>
    /// Delete category
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCategory(Guid id, [FromQuery] bool forceDelete = false)
    {
        var result = await _categoryService.DeleteCategoryAsync(id, forceDelete);

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
    /// Delete multiple categories
    /// </summary>
    [HttpPost("delete-batch")]
    public async Task<IActionResult> DeleteCategories([FromBody] DeleteCategoriesDto dto)
    {
        if (dto.Ids == null || !dto.Ids.Any())
        {
            return BadRequest(new { message = "No category IDs provided" });
        }

        var result = await _categoryService.DeleteCategoriesAsync(dto.Ids, dto.ForceDelete);

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
