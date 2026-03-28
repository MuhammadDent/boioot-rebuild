using Boioot.Application.Features.Pricing.DTOs;
using Boioot.Application.Features.Pricing.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

/// <summary>
/// Admin pricing management.
/// All routes: /api/admin/plans/{planId}/pricing
/// Pricing logic is fully isolated from plan limits, features, and enforcement.
/// </summary>
[Route("api/admin/plans/{planId:guid}/pricing")]
[Authorize(Policy = "AdminOnly")]
public class AdminPlanPricingController : BaseController
{
    private readonly IAdminPlanPricingService _service;

    public AdminPlanPricingController(IAdminPlanPricingService service)
    {
        _service = service;
    }

    /// <summary>GET /api/admin/plans/{planId}/pricing — list all pricing entries for a plan</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(Guid planId, CancellationToken ct)
    {
        var result = await _service.GetByPlanAsync(planId, ct);
        return Ok(result);
    }

    /// <summary>POST /api/admin/plans/{planId}/pricing — add a pricing entry (Monthly, Yearly, or OneTime)</summary>
    [HttpPost]
    public async Task<IActionResult> Create(Guid planId, [FromBody] UpsertPlanPricingRequest request, CancellationToken ct)
    {
        var result = await _service.CreateAsync(planId, request, ct);
        return CreatedAtAction(nameof(GetAll), new { planId }, result);
    }

    /// <summary>PUT /api/admin/plans/{planId}/pricing/{pricingId} — update a pricing entry</summary>
    [HttpPut("{pricingId:guid}")]
    public async Task<IActionResult> Update(Guid planId, Guid pricingId, [FromBody] UpsertPlanPricingRequest request, CancellationToken ct)
    {
        var result = await _service.UpdateAsync(planId, pricingId, request, ct);
        return Ok(result);
    }

    /// <summary>PATCH /api/admin/plans/{planId}/pricing/{pricingId}/active — toggle IsActive</summary>
    [HttpPatch("{pricingId:guid}/active")]
    public async Task<IActionResult> SetActive(Guid planId, Guid pricingId, [FromQuery] bool isActive, CancellationToken ct)
    {
        var result = await _service.SetActiveAsync(planId, pricingId, isActive, ct);
        return Ok(result);
    }

    /// <summary>DELETE /api/admin/plans/{planId}/pricing/{pricingId} — delete a pricing entry</summary>
    [HttpDelete("{pricingId:guid}")]
    public async Task<IActionResult> Delete(Guid planId, Guid pricingId, CancellationToken ct)
    {
        await _service.DeleteAsync(planId, pricingId, ct);
        return NoContent();
    }
}
