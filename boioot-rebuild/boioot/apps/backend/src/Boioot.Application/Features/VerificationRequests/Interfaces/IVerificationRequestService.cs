using Boioot.Application.Common.Models;
using Boioot.Application.Features.VerificationRequests.DTOs;

namespace Boioot.Application.Features.VerificationRequests.Interfaces;

public interface IVerificationRequestService
{
    // ── User-side ─────────────────────────────────────────────────────────────
    Task<VerificationRequestResponse> CreateRequestAsync(
        Guid userId, CreateVerificationRequestDto dto, CancellationToken ct = default);

    Task<VerificationRequestResponse> AddDocumentAsync(
        Guid userId, Guid requestId, AddDocumentDto dto, CancellationToken ct = default);

    Task<VerificationRequestResponse> SubmitRequestAsync(
        Guid userId, Guid requestId, CancellationToken ct = default);

    Task<PagedResult<VerificationRequestSummary>> GetMyRequestsAsync(
        Guid userId, int page, int pageSize, CancellationToken ct = default);

    Task<VerificationRequestResponse> GetMyRequestByIdAsync(
        Guid userId, Guid requestId, CancellationToken ct = default);

    // ── Admin-side ────────────────────────────────────────────────────────────
    Task<PagedResult<VerificationRequestSummary>> GetAllRequestsAsync(
        AdminVerificationRequestFilter filter, CancellationToken ct = default);

    Task<VerificationRequestResponse> GetRequestByIdAsync(
        Guid requestId, CancellationToken ct = default);

    Task<VerificationRequestResponse> ReviewRequestAsync(
        Guid adminUserId, Guid requestId, ReviewVerificationRequestDto dto, CancellationToken ct = default);
}
