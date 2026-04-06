using Boioot.Api.Authorization;
using Boioot.Application.Features.Plans.DTOs;
using Boioot.Application.Features.Plans.Interfaces;
using Boioot.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

[Route("api/admin/plan-catalog")]
[Authorize]
[RequirePermission(Permissions.SettingsManage)]
public class AdminCatalogController : BaseController
{
    private readonly IAdminCatalogService _catalog;

    public AdminCatalogController(IAdminCatalogService catalog)
    {
        _catalog = catalog;
    }

    // ── Plan Matrix ──────────────────────────────────────────────────────────

    /// <summary>GET /api/admin/plan-catalog/matrix — full plan × feature matrix for the matrix editor</summary>
    [HttpGet("matrix")]
    public async Task<IActionResult> GetMatrix(CancellationToken ct)
    {
        var result = await _catalog.GetMatrixAsync(ct);
        return Ok(result);
    }

    // ── Feature Definitions ──────────────────────────────────────────────────

    /// <summary>GET /api/admin/plan-catalog/features — list all feature definitions</summary>
    [HttpGet("features")]
    public async Task<IActionResult> GetFeatures(CancellationToken ct)
    {
        var result = await _catalog.GetFeaturesAsync(ct);
        return Ok(result);
    }

    /// <summary>POST /api/admin/plan-catalog/features — create a new feature definition</summary>
    [HttpPost("features")]
    public async Task<IActionResult> CreateFeature(
        [FromBody] CreateFeatureDefinitionRequest request, CancellationToken ct)
    {
        var result = await _catalog.CreateFeatureAsync(request, ct);
        return Created($"/api/admin/plan-catalog/features/{result.Id}", result);
    }

    /// <summary>PUT /api/admin/plan-catalog/features/{id} — update name/description/group/active</summary>
    [HttpPut("features/{id:guid}")]
    public async Task<IActionResult> UpdateFeature(
        Guid id,
        [FromBody] UpdateFeatureDefinitionRequest request,
        CancellationToken ct)
    {
        var result = await _catalog.UpdateFeatureAsync(id, request, ct);
        return Ok(result);
    }

    /// <summary>DELETE /api/admin/plan-catalog/features/{id} — delete if not in use</summary>
    [HttpDelete("features/{id:guid}")]
    public async Task<IActionResult> DeleteFeature(Guid id, CancellationToken ct)
    {
        await _catalog.DeleteFeatureAsync(id, ct);
        return NoContent();
    }

    // ── Limit Definitions ────────────────────────────────────────────────────

    /// <summary>GET /api/admin/plan-catalog/limits — list all limit definitions</summary>
    [HttpGet("limits")]
    public async Task<IActionResult> GetLimits(CancellationToken ct)
    {
        var result = await _catalog.GetLimitsAsync(ct);
        return Ok(result);
    }

    /// <summary>POST /api/admin/plan-catalog/limits — create a new limit definition</summary>
    [HttpPost("limits")]
    public async Task<IActionResult> CreateLimit(
        [FromBody] CreateLimitDefinitionRequest request, CancellationToken ct)
    {
        var result = await _catalog.CreateLimitAsync(request, ct);
        return Created($"/api/admin/plan-catalog/limits/{result.Id}", result);
    }

    /// <summary>PUT /api/admin/plan-catalog/limits/{id} — update name/description/unit/scope/active</summary>
    [HttpPut("limits/{id:guid}")]
    public async Task<IActionResult> UpdateLimit(
        Guid id,
        [FromBody] UpdateLimitDefinitionRequest request,
        CancellationToken ct)
    {
        var result = await _catalog.UpdateLimitAsync(id, request, ct);
        return Ok(result);
    }

    /// <summary>DELETE /api/admin/plan-catalog/limits/{id} — delete if not in use</summary>
    [HttpDelete("limits/{id:guid}")]
    public async Task<IActionResult> DeleteLimit(Guid id, CancellationToken ct)
    {
        await _catalog.DeleteLimitAsync(id, ct);
        return NoContent();
    }
}
