namespace Boioot.Application.Features.Notifications.Models;

public record NotificationTemplateDefinition(
    string Key,
    string TitleTemplate,
    string BodyTemplate,
    int DefaultPriority,
    bool Enabled);