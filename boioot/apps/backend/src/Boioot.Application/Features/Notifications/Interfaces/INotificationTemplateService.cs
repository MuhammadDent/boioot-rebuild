using Boioot.Application.Features.Notifications.Models;

namespace Boioot.Application.Features.Notifications.Interfaces;

public interface INotificationTemplateService
{
    NotificationTemplateDefinition? GetTemplate(string key);

    RenderedNotificationTemplate? Render(
        string key,
        IReadOnlyDictionary<string, string?> placeholders);
}