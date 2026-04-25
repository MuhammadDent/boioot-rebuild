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
    private readonly ILogger<MessagingController> _logger;

    public MessagingController(
        IMessagingService messagingService,
        ILogger<MessagingController> logger)
    {
        _messagingService = messagingService;
        _logger           = logger;
    }

    [HttpGet("conversations")]
    public async Task<IActionResult> GetConversations(CancellationToken ct)
    {
        try
        {
            var result = await _messagingService.GetConversationsAsync(GetUserId(), ct);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "[GetConversations] Failed for userId={UserId} — {ExType}: {Msg}",
                GetUserId(), ex.GetType().Name, ex.Message);
            // Return empty list instead of 500 — the UI handles empty gracefully.
            return Ok(Array.Empty<object>());
        }
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

    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount(CancellationToken ct)
    {
        try
        {
            var count = await _messagingService.GetTotalUnreadCountAsync(GetUserId(), ct);
            return Ok(new { total = count });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "[GetUnreadCount] Failed for userId={UserId} — {Msg}", GetUserId(), ex.Message);
            return Ok(new { total = 0 });
        }
    }

    /// <summary>
    /// POST /api/messages/support
    /// Get or create a conversation with the support team (Staff role, falls back to Admin).
    /// Bypasses subscription limits.
    /// </summary>
    [HttpPost("support")]
    public async Task<IActionResult> GetOrCreateSupportConversation(CancellationToken ct)
    {
        var result = await _messagingService.GetOrCreateSupportConversationAsync(GetUserId(), ct);
        return Ok(result);
    }

    /// <summary>
    /// POST /api/messages/admin
    /// Get or create a conversation with the administration (Admin role only).
    /// Bypasses subscription limits.
    /// </summary>
    [HttpPost("admin")]
    public async Task<IActionResult> GetOrCreateAdminConversation(CancellationToken ct)
    {
        var result = await _messagingService.GetOrCreateAdminConversationAsync(GetUserId(), ct);
        return Ok(result);
    }
}
