using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace WarungKopiAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UploadController : ControllerBase
{
    private readonly IWebHostEnvironment _env;
    private readonly string[] _allowedExtensions = { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
    private const long MaxFileSize = 5 * 1024 * 1024; // 5MB
    private const int MaxFilesLimit = 15; // Limit 15 files

    public UploadController(IWebHostEnvironment env)
    {
        _env = env;
    }

    /// <summary>
    /// Clean up old files if exceeds limit
    /// Keeps only the 15 most recent files
    /// </summary>
    private void CleanupOldFiles(string uploadsPath)
    {
        try
        {
            if (!Directory.Exists(uploadsPath))
                return;

            var files = new DirectoryInfo(uploadsPath)
                .GetFiles()
                .OrderByDescending(f => f.CreationTime)
                .ToList();

            // If more than MaxFilesLimit, delete oldest files
            if (files.Count > MaxFilesLimit)
            {
                var filesToDelete = files.Skip(MaxFilesLimit).ToList();
                foreach (var file in filesToDelete)
                {
                    try
                    {
                        file.Delete();
                        System.Console.WriteLine($"Deleted old file: {file.Name}");
                    }
                    catch (Exception ex)
                    {
                        System.Console.WriteLine($"Failed to delete file {file.Name}: {ex.Message}");
                    }
                }
            }
        }
        catch (Exception ex)
        {
            System.Console.WriteLine($"Error during cleanup: {ex.Message}");
        }
    }

    [HttpPost("image")]
    public async Task<IActionResult> UploadImage(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file uploaded" });

        if (file.Length > MaxFileSize)
            return BadRequest(new { message = "File size exceeds 5MB limit" });

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!_allowedExtensions.Contains(extension))
            return BadRequest(new { message = "Invalid file type. Allowed: jpg, jpeg, png, gif, webp" });

        // Create uploads directory if not exists
        var uploadsPath = Path.Combine(_env.ContentRootPath, "wwwroot", "uploads");
        if (!Directory.Exists(uploadsPath))
            Directory.CreateDirectory(uploadsPath);

        // Generate unique filename
        var fileName = $"{Guid.NewGuid()}{extension}";
        var filePath = Path.Combine(uploadsPath, fileName);

        // Save file
        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        // Cleanup old files if exceeds limit
        CleanupOldFiles(uploadsPath);

        // Return the URL path
        var imageUrl = $"/uploads/{fileName}";
        return Ok(new { imageUrl, message = "Image uploaded successfully" });
    }

    [HttpDelete("image")]
    public IActionResult DeleteImage([FromQuery] string imageUrl)
    {
        if (string.IsNullOrEmpty(imageUrl))
            return BadRequest(new { message = "Image URL is required" });

        // Extract filename from URL
        var fileName = Path.GetFileName(imageUrl);
        var filePath = Path.Combine(_env.ContentRootPath, "wwwroot", "uploads", fileName);

        if (System.IO.File.Exists(filePath))
        {
            System.IO.File.Delete(filePath);
            return Ok(new { message = "Image deleted" });
        }

        return NotFound(new { message = "Image not found" });
    }

    /// <summary>
    /// Get current upload folder stats
    /// </summary>
    [HttpGet("stats")]
    [Authorize(Roles = "Admin")]
    public IActionResult GetUploadStats()
    {
        try
        {
            var uploadsPath = Path.Combine(_env.ContentRootPath, "wwwroot", "uploads");
            
            if (!Directory.Exists(uploadsPath))
                return Ok(new { totalFiles = 0, maxLimit = MaxFilesLimit, usage = "0%" });

            var files = new DirectoryInfo(uploadsPath).GetFiles();
            var totalSize = files.Sum(f => f.Length);
            var usagePercent = (files.Length * 100) / MaxFilesLimit;

            return Ok(new
            {
                totalFiles = files.Length,
                maxLimit = MaxFilesLimit,
                usage = $"{usagePercent}%",
                totalSizeBytes = totalSize,
                totalSizeMB = Math.Round(totalSize / (1024.0 * 1024.0), 2),
                files = files
                    .OrderByDescending(f => f.CreationTime)
                    .Select(f => new
                    {
                        name = f.Name,
                        sizeBytes = f.Length,
                        sizeMB = Math.Round(f.Length / (1024.0 * 1024.0), 2),
                        createdAt = f.CreationTime,
                        url = $"/uploads/{f.Name}"
                    })
                    .ToList()
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }
}
