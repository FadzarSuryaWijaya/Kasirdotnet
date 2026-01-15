using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Swashbuckle.AspNetCore.SwaggerGen;
using WarungKopiAPI.Data;
using WarungKopiAPI.Services;

var builder = WebApplication.CreateBuilder(args);

// Add Database - SQL Server
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<WarungKopiDbContext>(options =>
{
    options.UseSqlServer(connectionString);
});

// Add Authentication
var jwtSettings = builder.Configuration.GetSection("Jwt");
var key = Encoding.UTF8.GetBytes(jwtSettings["Key"] ?? "");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(key),
            ValidateIssuer = true,
            ValidIssuer = jwtSettings["Issuer"],
            ValidateAudience = true,
            ValidAudience = jwtSettings["Audience"],
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };

        // Custom event handlers untuk JWT Bearer auth failures
        // Ensure JSON response bukan HTML saat authentication gagal
        options.Events = new JwtBearerEvents
        {
            OnAuthenticationFailed = context =>
            {
                context.NoResult();
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                context.Response.ContentType = "application/json";

                var errorResponse = new
                {
                    code = 401,
                    message = "Invalid or expired token",
                    details = context.Exception?.Message
                };

                return context.Response.WriteAsJsonAsync(errorResponse);
            },

            OnChallenge = context =>
            {
                context.HandleResponse();
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                context.Response.ContentType = "application/json";

                var errorResponse = new
                {
                    code = 401,
                    message = "Authorization token is missing or invalid",
                    details = context.ErrorDescription ?? "No authentication token provided"
                };

                return context.Response.WriteAsJsonAsync(errorResponse);
            },

            OnForbidden = context =>
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                context.Response.ContentType = "application/json";

                var errorResponse = new
                {
                    code = 403,
                    message = "Insufficient permissions",
                    details = "User does not have required roles or permissions"
                };

                return context.Response.WriteAsJsonAsync(errorResponse);
            }
        };
    });

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:3000", "http://127.0.0.1:3000")
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
    });
});

// Add Services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<TransactionService>();
builder.Services.AddScoped<AuditService>();

// Add PDF Generation Services (Playwright)
builder.Services.AddSingleton<IPlaywrightBrowserApp, PlaywrightBrowserApp>();
builder.Services.AddScoped<PdfGenerationService>();

// Add Controllers
builder.Services.AddControllers();

// Add Swagger/OpenAPI
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "Warung Kopi API", Version = "v1" });
    
    // Add JWT authentication to Swagger
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\""
    });

    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] { }
        }
    });
});

var app = builder.Build();

// Apply migrations and seed data at startup
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<WarungKopiDbContext>();
    
    // Apply pending migrations
    dbContext.Database.Migrate();
    
    // Seed default admin user if not exists
    var authService = scope.ServiceProvider.GetRequiredService<IAuthService>();
    var adminConfig = builder.Configuration.GetSection("DefaultAdminUser");
    var adminUsername = adminConfig["Username"] ?? "admin";
    var adminPassword = adminConfig["Password"] ?? "admin123";
    var adminName = adminConfig["Name"] ?? "Administrator";
    
    if (!dbContext.Users.Any(u => u.Username == adminUsername))
    {
        var adminUser = new WarungKopiAPI.Models.User
        {
            Id = Guid.NewGuid(),
            Name = adminName,
            Username = adminUsername,
            PasswordHash = authService.HashPassword(adminPassword),
            Role = "Admin",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        
        dbContext.Users.Add(adminUser);
        dbContext.SaveChanges();
    }

    // Seed default kasir user if not exists
    var kasirUsername = "kasir";
    var kasirPassword = "kasir123";
    var kasirName = "Kasir";

    if (!dbContext.Users.Any(u => u.Username == kasirUsername))
    {
        var kasirUser = new WarungKopiAPI.Models.User
        {
            Id = Guid.NewGuid(),
            Name = kasirName,
            Username = kasirUsername,
            PasswordHash = authService.HashPassword(kasirPassword),
            Role = "Kasir",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        
        dbContext.Users.Add(kasirUser);
        dbContext.SaveChanges();
    }
}

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Warung Kopi API v1");
        c.RoutePrefix = string.Empty; // Serve at root
    });
}

app.UseHttpsRedirection();

// Serve static files (for uploaded images)
app.UseStaticFiles();

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
