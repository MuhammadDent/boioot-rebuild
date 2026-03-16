using Boioot.Application.Features.Admin.DTOs;
using Boioot.Application.Features.Admin.Interfaces;
using Boioot.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

[Route("api/admin")]
[Authorize(Policy = "AdminOnly")]
public class AdminController : BaseController
{
    private readonly IAdminService _admin;

    public AdminController(IAdminService admin)
    {
        _admin = admin;
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] UserRole? role = null,
        [FromQuery] bool? isActive = null,
        CancellationToken ct = default)
    {
        var result = await _admin.GetUsersAsync(page, pageSize, role, isActive, ct);
        return Ok(result);
    }

    [HttpGet("companies")]
    public async Task<IActionResult> GetCompanies(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? city = null,
        [FromQuery] bool? isVerified = null,
        CancellationToken ct = default)
    {
        var result = await _admin.GetCompaniesAsync(page, pageSize, city, isVerified, ct);
        return Ok(result);
    }

    [HttpGet("properties")]
    public async Task<IActionResult> GetProperties(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] PropertyStatus? status = null,
        [FromQuery] string? city = null,
        CancellationToken ct = default)
    {
        var result = await _admin.GetPropertiesAsync(page, pageSize, status, city, ct);
        return Ok(result);
    }

    [HttpGet("projects")]
    public async Task<IActionResult> GetProjects(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] ProjectStatus? status = null,
        [FromQuery] string? city = null,
        CancellationToken ct = default)
    {
        var result = await _admin.GetProjectsAsync(page, pageSize, status, city, ct);
        return Ok(result);
    }

    [HttpGet("requests")]
    public async Task<IActionResult> GetRequests(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] RequestStatus? status = null,
        CancellationToken ct = default)
    {
        var result = await _admin.GetRequestsAsync(page, pageSize, status, ct);
        return Ok(result);
    }

    [HttpPatch("users/{userId:guid}/status")]
    public async Task<IActionResult> UpdateUserStatus(
        Guid userId,
        [FromBody] UpdateUserStatusRequest request,
        CancellationToken ct = default)
    {
        if (request.IsActive is null)
            return BadRequest(new { error = "حقل IsActive مطلوب" });

        var result = await _admin.UpdateUserStatusAsync(GetUserId(), userId, request.IsActive.Value, ct);
        return Ok(result);
    }

    [HttpPatch("users/{userId:guid}/role")]
    public async Task<IActionResult> UpdateUserRole(
        Guid userId,
        [FromBody] UpdateUserRoleRequest request,
        CancellationToken ct = default)
    {
        if (request.Role is null)
            return BadRequest(new { error = "حقل Role مطلوب" });

        var result = await _admin.UpdateUserRoleAsync(GetUserId(), userId, request.Role.Value, ct);
        return Ok(result);
    }

    [HttpPatch("companies/{companyId:guid}/verify")]
    public async Task<IActionResult> VerifyCompany(
        Guid companyId,
        [FromBody] VerifyCompanyRequest request,
        CancellationToken ct = default)
    {
        if (request.IsVerified is null)
            return BadRequest(new { error = "حقل IsVerified مطلوب" });

        var result = await _admin.VerifyCompanyAsync(companyId, request.IsVerified.Value, ct);
        return Ok(result);
    }

    // ── Listing Types CRUD ────────────────────────────────────────────────────

    [HttpGet("listing-types")]
    public async Task<IActionResult> GetListingTypes(CancellationToken ct = default)
    {
        var result = await _admin.GetListingTypesAsync(ct);
        return Ok(result);
    }

    [HttpPost("listing-types")]
    public async Task<IActionResult> CreateListingType(
        [FromBody] UpsertListingTypeRequest request,
        CancellationToken ct = default)
    {
        var result = await _admin.CreateListingTypeAsync(request, ct);
        return Created($"api/admin/listing-types/{result.Id}", result);
    }

    [HttpPut("listing-types/{id:guid}")]
    public async Task<IActionResult> UpdateListingType(
        Guid id,
        [FromBody] UpsertListingTypeRequest request,
        CancellationToken ct = default)
    {
        var result = await _admin.UpdateListingTypeAsync(id, request, ct);
        return Ok(result);
    }

    [HttpDelete("listing-types/{id:guid}")]
    public async Task<IActionResult> DeleteListingType(
        Guid id,
        CancellationToken ct = default)
    {
        await _admin.DeleteListingTypeAsync(id, ct);
        return NoContent();
    }

    // ── Property Types ────────────────────────────────────────────────────────

    [HttpGet("property-types")]
    public async Task<IActionResult> GetPropertyTypes(CancellationToken ct = default)
        => Ok(await _admin.GetPropertyTypesAsync(ct));

    [HttpPost("property-types")]
    public async Task<IActionResult> CreatePropertyType(
        [FromBody] UpsertPropertyTypeRequest request, CancellationToken ct = default)
    {
        var result = await _admin.CreatePropertyTypeAsync(request, ct);
        return Created($"api/admin/property-types/{result.Id}", result);
    }

    [HttpPut("property-types/{id:guid}")]
    public async Task<IActionResult> UpdatePropertyType(
        Guid id, [FromBody] UpsertPropertyTypeRequest request, CancellationToken ct = default)
        => Ok(await _admin.UpdatePropertyTypeAsync(id, request, ct));

    [HttpDelete("property-types/{id:guid}")]
    public async Task<IActionResult> DeletePropertyType(
        Guid id, CancellationToken ct = default)
    {
        await _admin.DeletePropertyTypeAsync(id, ct);
        return NoContent();
    }

    // ── Ownership Types ───────────────────────────────────────────────────────

    [HttpGet("ownership-types")]
    public async Task<IActionResult> GetOwnershipTypes(CancellationToken ct = default)
        => Ok(await _admin.GetOwnershipTypesAsync(ct));

    [HttpPost("ownership-types")]
    public async Task<IActionResult> CreateOwnershipType(
        [FromBody] UpsertOwnershipTypeRequest request, CancellationToken ct = default)
    {
        var result = await _admin.CreateOwnershipTypeAsync(request, ct);
        return Created($"api/admin/ownership-types/{result.Id}", result);
    }

    [HttpPut("ownership-types/{id:guid}")]
    public async Task<IActionResult> UpdateOwnershipType(
        Guid id, [FromBody] UpsertOwnershipTypeRequest request, CancellationToken ct = default)
        => Ok(await _admin.UpdateOwnershipTypeAsync(id, request, ct));

    [HttpDelete("ownership-types/{id:guid}")]
    public async Task<IActionResult> DeleteOwnershipType(
        Guid id, CancellationToken ct = default)
    {
        await _admin.DeleteOwnershipTypeAsync(id, ct);
        return NoContent();
    }
}
