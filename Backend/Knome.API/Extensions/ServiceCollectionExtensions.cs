using System.Linq;
using System.Text;
using System.Threading.RateLimiting;
using FluentValidation;
using Knome.API.Configuration;
using Knome.API.Configurations;
using Knome.API.Constants;
using Knome.API.Data;
using Knome.API.Filters;
using Knome.API.Interfaces;
using Knome.API.Repositories;
using Knome.API.Responses;
using Knome.API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

namespace Knome.API.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddMemoryCache();
        AddCorsPolicy(services, configuration);
        AddDatabase(services, configuration);
        AddAuthentication(services, configuration);
        AddAuthorization(services);
        AddRateLimiting(services);
        AddApplicationServices(services, configuration);
        AddSwagger(services);
        services.AddSignalR();

        return services;
    }

    // ------------------------------------------------------------------ //

    private static void AddCorsPolicy(IServiceCollection services, IConfiguration configuration)
    {
        var corsSection = configuration.GetSection("CorsSettings");
        services.Configure<CorsSettings>(corsSection);
        var corsSettings = corsSection.Get<CorsSettings>() ?? new CorsSettings();

        services.AddCors(options =>
        {
            options.AddPolicy(ApiConstants.CorsPolicyName, builder =>
            {
                builder.SetIsOriginAllowed(origin => true)
                       .AllowAnyMethod()
                       .AllowAnyHeader()
                       .AllowCredentials();
            });
        });
    }

    private static void AddDatabase(IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");
        services.AddDbContext<KnomeDbContext>(options => options.UseSqlServer(connectionString));
        services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
    }

    private static void AddAuthentication(IServiceCollection services, IConfiguration configuration)
    {
        var jwtSection = configuration.GetSection("JwtSettings");
        var jwtSettings = jwtSection.Get<JwtSettings>() ?? new JwtSettings();

        // F-018: Prioritize environment variable / user secrets override for JWT SecretKey
        var secretKeyOverride = configuration["JWT_SECRET_KEY"] ?? configuration["JwtSettings:SecretKey"];
        if (!string.IsNullOrEmpty(secretKeyOverride))
        {
            jwtSettings.SecretKey = secretKeyOverride;
        }

        services.Configure<JwtSettings>(options =>
        {
            options.SecretKey = jwtSettings.SecretKey;
            options.Issuer = jwtSettings.Issuer;
            options.Audience = jwtSettings.Audience;
            options.ExpiryMinutes = jwtSettings.ExpiryMinutes;
        });

        var key = Encoding.UTF8.GetBytes(jwtSettings.SecretKey);

        services.AddAuthentication(options =>
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
                ValidIssuers = new[] { jwtSettings.Issuer, "EmployeeHub.Identity", "Knome.API" },
                ValidAudiences = new[] { jwtSettings.Audience, "Knome.Client", "EmployeeHub.Client" },
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ClockSkew = System.TimeSpan.Zero
            };
            options.Events = new JwtBearerEvents
            {
                OnChallenge = async context =>
                {
                    context.HandleResponse();
                    context.Response.StatusCode = 401;
                    context.Response.ContentType = "application/json";
                    var apiResponse = Knome.API.Responses.ApiResponse.FailureResponse(401, "Unauthorized access.");
                    await Microsoft.AspNetCore.Http.HttpResponseWritingExtensions.WriteAsync(context.Response, System.Text.Json.JsonSerializer.Serialize(apiResponse));
                }
            };
        });
    }

    private static void AddAuthorization(IServiceCollection services)
    {
        services.AddAuthorization(options =>
        {
            options.AddPolicy(Roles.Employee,       p => p.RequireRole(Roles.Employee));
            options.AddPolicy(Roles.CommunityAdmin, p => p.RequireRole(Roles.CommunityAdmin));
            options.AddPolicy(Roles.HRAdmin,        p => p.RequireRole(Roles.HRAdmin));
            options.AddPolicy(Roles.SystemAdmin,    p => p.RequireRole(Roles.SystemAdmin));
        });
    }

    private static void AddRateLimiting(IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.AddPolicy("LoginRateLimiter", httpContext =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? httpContext.Request.Headers.Host.ToString(),
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        AutoReplenishment = true,
                        PermitLimit = 30,
                        Window = System.TimeSpan.FromMinutes(1)
                    }));
        });
    }

    private static void AddApplicationServices(IServiceCollection services, IConfiguration configuration)
    {
        services.AddControllers(options =>
        {
            options.Filters.Add<ValidationFilter>();
        })
        .ConfigureApiBehaviorOptions(options =>
        {
            options.InvalidModelStateResponseFactory = context =>
            {
                var errors = context.ModelState
                    .Where(e => e.Value?.Errors.Count > 0)
                    .SelectMany(e => e.Value!.Errors.Select(x => x.ErrorMessage))
                    .ToList();

                var response = ApiResponse.FailureResponse(
                    StatusCodes.Status400BadRequest,
                    ApiConstants.Messages.ValidationError,
                    errors);

                return new BadRequestObjectResult(response);
            };
        });
        services.AddAutoMapper(typeof(Program).Assembly);
        services.AddValidatorsFromAssembly(typeof(Program).Assembly);
        services.AddEndpointsApiExplorer();

        // Configure FormOptions for large file uploads (500 MB)
        services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(options =>
        {
            options.ValueLengthLimit = int.MaxValue;
            options.MultipartBodyLengthLimit = 500L * 1024L * 1024L; // 500 MB
            options.MultipartHeadersLengthLimit = int.MaxValue;
        });

        // Auth
        services.AddScoped<IAuthService, AuthService>();

        // User Module
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IFileStorageService, LocalFileStorageService>();
        services.AddScoped<IUserService, UserService>();

        // Karma & Gamification Module (Phase 8)
        services.AddScoped<IKarmaRepository, KarmaRepository>();
        services.AddScoped<IKarmaService, KarmaService>();

        // Content Foundation & Interactions Module
        services.AddScoped<IContentInteractionRepository, ContentInteractionRepository>();
        services.AddScoped<IContentInteractionService, ContentInteractionService>();

        // Communities & Membership Module
        services.AddScoped<ICommunityRepository, CommunityRepository>();
        services.AddScoped<ICommunityService, CommunityService>();

        // Post & Article Engines Module
        services.AddScoped<IPostRepository, PostRepository>();
        services.AddScoped<IPostService, PostService>();
        services.AddScoped<IArticleRepository, ArticleRepository>();
        services.AddScoped<IArticleService, ArticleService>();

        // Media Channels Module (Video & Podcast)
        services.AddScoped<IVideoRepository, VideoRepository>();
        services.AddScoped<IVideoService, VideoService>();
        services.AddScoped<IPodcastRepository, PodcastRepository>();
        services.AddScoped<IPodcastService, PodcastService>();

        // Dashboard Feed & Hot Posts Ranking Module (Phase 8)
        services.AddScoped<IFeedRepository, FeedRepository>();
        services.AddScoped<IFeedService, FeedService>();

        // Search Module (Phase 9)
        services.AddScoped<ISearchRepository, SearchRepository>();
        services.AddScoped<ISearchService, SearchService>();

        // Audit Trail Infrastructure (Phase 10.1)
        services.AddScoped<IAuditLogRepository, AuditLogRepository>();
        services.AddScoped<IAuditLogService, AuditLogService>();

        // Suspension Guard (Phase 10.2) — reusable across content creation workflows
        services.AddScoped<ISuspensionGuard, SuspensionGuard>();

        // Jobs & Notifications Module (Phase 11)
        services.AddScoped<IJobRepository, JobRepository>();
        services.AddScoped<IJobService, JobService>();
        services.AddScoped<INotificationRepository, NotificationRepository>();
        services.AddScoped<INotificationService, NotificationService>();

        // SMTP & Email Notification Service
        services.Configure<SmtpSettings>(configuration.GetSection("SmtpSettings"));
        services.AddScoped<IEmailService, EmailService>();
    }

    private static void AddSwagger(IServiceCollection services)
    {
        var jwtScheme = new OpenApiSecurityScheme
        {
            Name = "Authorization",
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            In = ParameterLocation.Header,
            Description = "Enter your JWT token. Example: Bearer eyJhbGci..."
        };

        var jwtRequirement = new OpenApiSecurityRequirement
        {
            {
                new OpenApiSecurityScheme
                {
                    Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
                },
                Array.Empty<string>()
            }
        };

        services.AddSwaggerGen(c =>
        {
            c.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "Knome Enterprise API",
                Version = "v1",
                Description = "Enterprise-grade ASP.NET Core 9 Web API for the Knome platform."
            });

            c.CustomSchemaIds(type => type.FullName);

            c.AddSecurityDefinition("Bearer", jwtScheme);
            c.AddSecurityRequirement(jwtRequirement);
        });
    }
}