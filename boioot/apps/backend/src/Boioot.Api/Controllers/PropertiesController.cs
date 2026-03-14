using Boioot.Application.Features.Properties.DTOs;
using Boioot.Application.Features.Properties.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

[Route("api/properties")]
public class PropertiesController : BaseController
{
    private readonly IPropertyService _propertyService;

    public PropertiesController(IPropertyService propertyService)
    {
        _propertyService = propertyService;
    }

    [HttpGet]
    public async Task<IActionResult> GetList([FromQuery] PropertyFilters filters, CancellationToken ct)
    {
        var result = await _propertyService.GetPublicListAsync(filters, ct);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await _propertyService.GetByIdPublicAsync(id, ct);
        return Ok(result);
    }

    [Authorize(Policy = "AdminOrCompanyOwner")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePropertyRequest request, CancellationToken ct)
    {
        var result = await _propertyService.CreateAsync(GetUserId(), GetUserRole(), request, ct);
        return StatusCode(201, result);
    }

    [Authorize(Policy = "AdminOrCompanyOwnerOrAgent")]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdatePropertyRequest request, CancellationToken ct)
    {
        var result = await _propertyService.UpdateAsync(GetUserId(), GetUserRole(), id, request, ct);
        return Ok(result);
    }

    [Authorize(Policy = "AdminOrCompanyOwner")]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _propertyService.DeleteAsync(GetUserId(), GetUserRole(), id, ct);
        return NoContent();
    }
}
