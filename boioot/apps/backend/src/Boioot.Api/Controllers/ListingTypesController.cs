using Boioot.Application.Features.Admin.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

[Route("api/listing-types")]
[AllowAnonymous]
public class ListingTypesController : BaseController
{
    private readonly IAdminService _admin;

    public ListingTypesController(IAdminService admin)
    {
        _admin = admin;
    }

    [HttpGet]
    public async Task<IActionResult> GetActive(CancellationToken ct = default)
    {
        var all = await _admin.GetListingTypesAsync(ct);
        return Ok(all.Where(t => t.IsActive));
    }
}
