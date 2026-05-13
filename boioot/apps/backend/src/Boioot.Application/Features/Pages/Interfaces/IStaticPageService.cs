using Boioot.Application.Features.Pages.DTOs;

namespace Boioot.Application.Features.Pages.Interfaces;

public interface IStaticPageService
{
    Task EnsureTableAsync(CancellationToken ct = default);

    Task<StaticPagePublicDto?> GetBySlugAsync(string slug, CancellationToken ct = default);
    Task<List<FooterLinkDto>>  GetFooterLinksAsync(CancellationToken ct = default);

    Task<List<StaticPageAdminDto>> GetAllAdminAsync(CancellationToken ct = default);
    Task<StaticPageAdminDto>       CreateAsync(UpsertStaticPageDto dto, CancellationToken ct = default);
    Task<StaticPageAdminDto>       UpdateAsync(Guid id, UpsertStaticPageDto dto, CancellationToken ct = default);
    Task                           DeleteAsync(Guid id, CancellationToken ct = default);
}
