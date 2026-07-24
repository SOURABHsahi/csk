using Knome.API.Constants;
using Knome.API.Hubs;
using Knome.API.Middleware;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.FileProviders;
using System.IO;

namespace Knome.API.Extensions;

public static class ApplicationBuilderExtensions
{
    public static WebApplication UseInfrastructure(this WebApplication app)
    {
        // Global Exception Handling Middleware
        app.UseMiddleware<ExceptionHandlingMiddleware>();

        // F-022: Security Headers Middleware
        app.UseMiddleware<SecurityHeadersMiddleware>();

        // Swagger/OpenAPI UI (Development Mode)
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI(c =>
            {
                c.SwaggerEndpoint("/swagger/v1/swagger.json", "Knome Enterprise API v1");
                c.RoutePrefix = "swagger"; // Expose UI at /swagger
            });
        }

        if (!app.Environment.IsDevelopment())
        {
            app.UseHttpsRedirection();
        }

        // Enable CORS
        app.UseCors(ApiConstants.CorsPolicyName);

        // Serve uploaded files (images, videos, audio, docs) from wwwroot/uploads
        var wwwroot = app.Environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        if (!Directory.Exists(wwwroot)) Directory.CreateDirectory(wwwroot);
        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(wwwroot),
            RequestPath = string.Empty,
            ServeUnknownFileTypes = true // allow .mp4, .mp3, .docx etc.
        });

        // F-023: Rate Limiting
        app.UseRateLimiter();

        app.UseAuthentication();
        app.UseAuthorization();

        // Map Controllers
        app.MapControllers();

        // Map SignalR Hubs
        app.MapHub<NotificationHub>("/hubs/notifications");

        // Redirect root (/) to /swagger to prevent browser 404
        app.MapGet("/", () => Microsoft.AspNetCore.Http.Results.Redirect("/swagger"));

        return app;
    }
}
