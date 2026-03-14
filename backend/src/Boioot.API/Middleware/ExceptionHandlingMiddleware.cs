using System.Net;
using System.Text.Json;
using Boioot.Application.Exceptions;
using Boioot.Shared.Models;

namespace Boioot.API.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An unhandled exception occurred: {Message}", ex.Message);
            await HandleExceptionAsync(context, ex);
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";

        var (statusCode, response) = exception switch
        {
            NotFoundException ex => (HttpStatusCode.NotFound, ApiResponse.Fail(ex.Message)),
            UnauthorizedException ex => (HttpStatusCode.Unauthorized, ApiResponse.Fail(ex.Message)),
            ForbiddenException ex => (HttpStatusCode.Forbidden, ApiResponse.Fail(ex.Message)),
            ValidationException ex => (HttpStatusCode.UnprocessableEntity, ApiResponse.Fail(ex.Errors)),
            AppException ex => ((HttpStatusCode)ex.StatusCode, ApiResponse.Fail(ex.Message)),
            _ => (HttpStatusCode.InternalServerError, ApiResponse.Fail("An unexpected error occurred."))
        };

        context.Response.StatusCode = (int)statusCode;

        var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
        await context.Response.WriteAsync(JsonSerializer.Serialize(response, jsonOptions));
    }
}
