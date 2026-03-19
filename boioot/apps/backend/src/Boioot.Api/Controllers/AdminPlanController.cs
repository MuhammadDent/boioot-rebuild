using Boioot.Api.Authorization;
using Boioot.Application.Features.Plans.DTOs;
using Boioot.Application.Features.Plans.Interfaces;
using Boioot.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

[Route("api/admin/plans")]
[Authorize]
[RequirePermission(Permissions.SettingsManage)]
public class AdminPlanController : BaseController
{
    private readonly IAdminPlanService _plans;

    public AdminPlanController(IAdminPlanService plans)
    {
        _plans = plans;
    }

    /// <summary>GET /api/admin/plans — list all plans (including inactive)</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var result = await _plans.GetAllPlansAsync(ct);
        return Ok(result);
    }

    /// <summary>GET /api/admin/plans/{id} — full plan with limits + features</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await _plans.GetPlanDetailAsync(id, ct);
        return Ok(result);
    }

    /// <summary>POST /api/admin/plans — create a new plan</summary>
    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreatePlanRequest request, CancellationToken ct)
    {
        var result = await _plans.CreatePlanAsync(request, ct);
        return Created($"/api/admin/plans/{result.Id}", result);
    }

    /// <summary>PUT /api/admin/plans/{id} — update plan info</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        Guid id, [FromBody] UpdatePlanRequest request, CancellationToken ct)
    {
        var result = await _plans.UpdatePlanAsync(id, request, ct);
        return Ok(result);
    }

    /// <summary>DELETE /api/admin/plans/{id} — soft-delete (deactivate)</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _plans.DeletePlanAsync(id, ct);
        return NoContent();
    }

    /// <summary>PUT /api/admin/plans/{id}/limits/{limitKey} — set a limit value</summary>
    [HttpPut("{id:guid}/limits/{limitKey}")]
    public async Task<IActionResult> SetLimit(
        Guid id,
        string limitKey,
        [FromBody] SetPlanLimitRequest request,
        CancellationToken ct)
    {
        var result = await _plans.SetLimitAsync(id, limitKey, request.Value, ct);
        return Ok(result);
    }

    /// <summary>PUT /api/admin/plans/{id}/features/{featureKey} — toggle a feature</summary>
    [HttpPut("{id:guid}/features/{featureKey}")]
    public async Task<IActionResult> SetFeature(
        Guid id,
        string featureKey,
        [FromBody] SetPlanFeatureRequest request,
        CancellationToken ct)
    {
        var result = await _plans.SetFeatureAsync(id, featureKey, request.IsEnabled, ct);
        return Ok(result);
    }
}
