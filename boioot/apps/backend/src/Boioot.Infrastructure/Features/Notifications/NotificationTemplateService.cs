using System.Text.RegularExpressions;
using Boioot.Application.Features.Notifications.Interfaces;
using Boioot.Application.Features.Notifications.Models;
using Microsoft.Extensions.Logging;

namespace Boioot.Infrastructure.Features.Notifications;

public class NotificationTemplateService : INotificationTemplateService
{
    private static readonly Regex PlaceholderRegex = new(
        @"\{(?<key>[A-Za-z0-9_]+)\}",
        RegexOptions.Compiled);

    private readonly ILogger<NotificationTemplateService> _logger;

    public NotificationTemplateService(ILogger<NotificationTemplateService> logger)
    {
        _logger = logger;
    }

    public NotificationTemplateDefinition? GetTemplate(string key)
    {
        return NotificationTemplateRegistry.Templates.TryGetValue(key, out var template)
            ? template
            : null;
    }

    public RenderedNotificationTemplate? Render(
        string key,
        IReadOnlyDictionary<string, string?> placeholders)
    {
        try
        {
            var template = GetTemplate(key);
            if (template is null)
            {
                _logger.LogWarning("[Notifications] Template not found for key={Key}", key);
                return null;
            }

            if (!template.Enabled)
            {
                _logger.LogInformation("[Notifications] Template disabled for key={Key}", key);
                return null;
            }

            return new RenderedNotificationTemplate(
                Key: template.Key,
                Title: RenderText(template.TitleTemplate, placeholders),
                Body: RenderText(template.BodyTemplate, placeholders),
                Priority: template.DefaultPriority);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[Notifications] Template render failed for key={Key}", key);
            return null;
        }
    }

    private static string RenderText(
        string template,
        IReadOnlyDictionary<string, string?> placeholders)
    {
        return PlaceholderRegex.Replace(template, match =>
        {
            var key = match.Groups["key"].Value;
            return placeholders.TryGetValue(key, out var value)
                ? value ?? string.Empty
                : string.Empty;
        });
    }
}