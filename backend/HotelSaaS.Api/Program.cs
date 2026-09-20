using System.Text;
using HotelSaaS.Api.Middleware;
using HotelSaaS.Application.Common.Interfaces;
using HotelSaaS.Application.Interfaces;
using HotelSaaS.Infrastructure.Persistence;
using HotelSaaS.Infrastructure.Persistence.Repositories;
using HotelSaaS.Infrastructure.Services;
using HotelSaaS.Infrastructure.Tenant;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// 1. Add Services to DI container
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();

// 2. Swagger with JWT Authorization support
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Hotel SaaS Multi-Tenant API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// 3. Database Context (SQLite / Turso DB setup with sanitized keywords)
var rawConn = builder.Configuration.GetConnectionString("TursoConnection") 
              ?? builder.Configuration.GetConnectionString("DefaultConnection") 
              ?? "Data Source=hotelsaas.db";

string cleanConn = "Data Source=hotelsaas.db";

if (!string.IsNullOrEmpty(rawConn))
{
    // Extract only supported SQLite keywords (Data Source=...) to prevent ArgumentException
    var parts = rawConn.Split(';');
    var dsPart = parts.FirstOrDefault(p => p.Trim().StartsWith("Data Source=", StringComparison.OrdinalIgnoreCase));
    
    if (dsPart != null && !dsPart.Contains("libsql://"))
    {
        cleanConn = dsPart.Trim();
    }
}

// Convert relative SQLite file path to Absolute Path anchored to API Project ContentRootPath
if (cleanConn.StartsWith("Data Source=", StringComparison.OrdinalIgnoreCase))
{
    var fileName = cleanConn.Substring("Data Source=".Length).Trim();
    if (!Path.IsPathRooted(fileName))
    {
        var absoluteDbPath = Path.Combine(builder.Environment.ContentRootPath, fileName);
        cleanConn = $"Data Source={absoluteDbPath}";
    }
}

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlite(cleanConn));

// 4. Scoped Tenant Context & Infrastructure Services
builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
builder.Services.AddScoped<IRoomRepository, RoomRepository>();
builder.Services.AddScoped<IReservationRepository, ReservationRepository>();
builder.Services.AddScoped<ICustomerRepository, CustomerRepository>();

builder.Services.AddScoped<ITursoSyncService, TursoSyncService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<ITenantContext, TenantContext>();
builder.Services.AddScoped<IPasswordHasher, PasswordHasher>();
builder.Services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IHotelService, HotelService>();
builder.Services.AddScoped<IRoomService, RoomService>();
builder.Services.AddScoped<IReservationService, ReservationService>();
builder.Services.AddScoped<ICustomerService, CustomerService>();
builder.Services.AddScoped<ICalendarService, CalendarService>();
builder.Services.AddScoped<IInvoiceService, InvoiceService>();
builder.Services.AddScoped<IPaymentService, PaymentService>();
builder.Services.AddScoped<IPosService, PosService>();
builder.Services.AddScoped<IHousekeepingService, HousekeepingService>();
builder.Services.AddScoped<IInventoryService, InventoryService>();
builder.Services.AddScoped<IRestaurantService, RestaurantService>();
builder.Services.AddScoped<IExpenseService, ExpenseService>();
builder.Services.AddScoped<IStaffService, StaffService>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();

// 5. JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"] ?? "SUPER_SECRET_JWT_KEY_FOR_HOTEL_SAAS_DEVELOPMENT_123456";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "HotelSaaS.Api";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "HotelSaaS.Client";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
});

// 6. CORS policy
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// 7. HTTP Request Pipeline
app.UseMiddleware<GlobalExceptionMiddleware>();

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Hotel SaaS API v1");
    c.RoutePrefix = "swagger";
});

app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseMiddleware<TenantMiddleware>();
app.UseAuthorization();

app.MapControllers();

// Ensure database schema in all environments (Development & Production Docker)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
    try
    {
        db.Database.EnsureCreated();
        DbInitializer.Initialize(db, hasher);

        var conn = db.Database.GetDbConnection();
        Console.WriteLine($"[DB DIAGNOSTICS] DataSource: {conn.DataSource} | Database: {conn.Database}");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[DbInitializer Error]: {ex.Message}\n{ex.StackTrace}");
    }
}

app.Run();

// Partial class for WebApplicationFactory integration testing
public partial class Program { }
