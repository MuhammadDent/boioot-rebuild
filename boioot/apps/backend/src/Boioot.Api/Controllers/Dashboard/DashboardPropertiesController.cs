using Boioot.Application.Features.Properties.DTOs;
using Boioot.Application.Features.Properties.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers.Dashboard;

[Authorize]
[Route("api/dashboard/properties")]
public class DashboardPropertiesController : BaseController
{
    private readonly IPropertyService _propertyService;

    public DashboardPropertiesController(IPropertyService propertyService)
    {
        _propertyService = propertyService;
    }

    [HttpGet]
    public async Task<IActionResult> GetList([FromQuery] PropertyFilters filters, CancellationToken ct)
    {
        var result = await _propertyService.GetDashboardListAsync(
            GetUserId(), GetUserRole(), filters, ct);
        return Ok(result);
    }
}
