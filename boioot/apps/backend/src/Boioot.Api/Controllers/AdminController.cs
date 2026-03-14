using Boioot.Application.Features.Admin.DTOs;
using Boioot.Application.Features.Admin.Interfaces;
using Boioot.Domain.Constants;
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
        var result = await _admin.UpdateUserStatusAsync(userId, request.IsActive!.Value, ct);
        return Ok(result);
    }

    [HttpPatch("companies/{companyId:guid}/verify")]
    public async Task<IActionResult> VerifyCompany(
        Guid companyId,
        [FromBody] VerifyCompanyRequest request,
        CancellationToken ct = default)
    {
        var result = await _admin.VerifyCompanyAsync(companyId, request.IsVerified!.Value, ct);
        return Ok(result);
    }
}
