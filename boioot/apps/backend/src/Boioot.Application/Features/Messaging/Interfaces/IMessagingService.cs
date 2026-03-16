using Boioot.Application.Features.Messaging.DTOs;

namespace Boioot.Application.Features.Messaging.Interfaces;

public interface IMessagingService
{
    Task<IReadOnlyList<ConversationSummaryResponse>> GetConversationsAsync(Guid userId, CancellationToken ct = default);
    Task<ConversationSummaryResponse> GetOrCreateConversationAsync(Guid userId, CreateConversationRequest request, CancellationToken ct = default);
    Task<ConversationDetailResponse> GetConversationAsync(Guid userId, Guid conversationId, int page, int pageSize, CancellationToken ct = default);
    Task<MessageResponse> SendMessageAsync(Guid userId, Guid conversationId, SendMessageRequest request, CancellationToken ct = default);
    Task<int> GetTotalUnreadCountAsync(Guid userId, CancellationToken ct = default);
}
