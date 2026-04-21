using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Boioot.Api.Hubs;

[Authorize]
public class NotificationsHub : Hub
{
}