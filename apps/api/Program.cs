using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using WarungKopiAPI.Data;
using WarungKopiAPI.Services;

var builder = WebApplication.CreateBuilder(args);

//
// =======================
// DATABASE CONFIG (GUARD)
// =======================
//
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new Exception("Connection string 'DefaultConnection' is NULL or EMPTY");
}

builder.Services.AddDbContext<WarungKopiDbContext>(options =>
{
    options.UseSqlServer(connectionString);
});

//
// =======================
// JWT CONFIG (GUARD)
// =======================
//
var jwtSection = builder.Configuration.GetSection("Jwt");

var jwtKey = jwtSection["Key"];
var jwtIssuer = jwtSection["Issuer"];
var jwtAudience = jwtSection["Audience"];

if (string.IsNullOrWhiteSpace(jwtKey))
{
    throw new Exception("JWT Key is missing in configuration");
}

if (string.IsNullOrWhiteSpace(jwtIssuer))
{
    throw new Exception("JWT Issuer is missing in configuration");
}

if (string.IsNullOrWhiteSpace(jwtAudience))
{
    throw new Exception("JWT Audience is missing in configuration");
}

var key = Encoding.UTF8.GetBytes(jwtKey);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(key),
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = jwtAudience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };

        options.Events = new JwtBearerEvents
        {
            OnAuthenticationFailed = context =>
            {
                context.NoResult();
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                context.Response.ContentType = "application/json";

                return context.Response.WriteAsJsonAsync(new
                {
                    code = 401,
                    message = "Invalid or expired token",
                    details = context.Exception?.Message
                });
            },

            OnChallenge = context =>
            {
                context.HandleResponse();
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                context.Response.ContentType = "application/json";

                return context.Response.WriteAsJsonAsync(new
                {
                    code = 401,
                    message = "Authorization token is missing or invalid"
                });
            },

            OnForbidden = context =>
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                context.Response.ContentType = "application/json";

                return context.Response.WriteAsJsonAsync(new
                {
                    code = 403,
                    message = "Insufficient permissions"
                });
            }
        };
    });

//
// =======================
// CORS
// =======================
//
var corsOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? new[]
    {
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    };

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(corsOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

//
// =======================
// SERVICES
// =======================
//
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<TransactionService>();
builder.Services.AddScoped<AuditService>();

// Playwright / PDF
builder.Services.AddSingleton<IPlaywrightBrowserApp, PlaywrightBrowserApp>();
builder.Services.AddScoped<PdfGenerationService>();

//
// =======================
// CONTROLLERS + SWAGGER
// =======================
//
builder.Services.AddControllers();

builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new()
    {
        Title = "Warung Kopi API",
        Version = "v1"
    });

    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
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
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

//
// =======================
// MIDDLEWARE PIPELINE
// =======================
//

// Swagger AKTIF DI PROD (sementara debug)
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Warung Kopi API v1");
});

// Simple health check (WAJIB)
app.MapGet("/", () => "API IS UP");
app.MapGet("/api/health", () => "OK");

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
