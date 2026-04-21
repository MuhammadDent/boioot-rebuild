namespace Boioot.Application.Features.Notifications.Models;

public record RenderedNotificationTemplate(
    string Key,
    string Title,
    string Body,
    int Priority);