using Boioot.Application.Features.Messaging.DTOs;
using Boioot.Application.Features.Messaging.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

[Authorize]
[Route("api/messages")]
public class MessagingController : BaseController
{
    private readonly IMessagingService _messagingService;

    public MessagingController(IMessagingService messagingService)
    {
        _messagingService = messagingService;
    }

    [HttpGet("conversations")]
    public async Task<IActionResult> GetConversations(CancellationToken ct)
    {
        var result = await _messagingService.GetConversationsAsync(GetUserId(), ct);
        return Ok(result);
    }

    [HttpPost("conversations")]
    public async Task<IActionResult> CreateConversation(
        [FromBody] CreateConversationRequest request, CancellationToken ct)
    {
        var result = await _messagingService.GetOrCreateConversationAsync(
            GetUserId(), request, ct);
        return StatusCode(201, result);
    }

    [HttpGet("conversations/{id:guid}")]
    public async Task<IActionResult> GetConversation(
        Guid id,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        var result = await _messagingService.GetConversationAsync(
            GetUserId(), id, page, pageSize, ct);
        return Ok(result);
    }

    [HttpPost("conversations/{id:guid}/messages")]
    public async Task<IActionResult> SendMessage(
        Guid id, [FromBody] SendMessageRequest request, CancellationToken ct)
    {
        var result = await _messagingService.SendMessageAsync(
            GetUserId(), id, request, ct);
        return StatusCode(201, result);
    }
}
