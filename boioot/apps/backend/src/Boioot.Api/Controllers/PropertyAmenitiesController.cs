using Boioot.Application.Features.Properties.DTOs;
using Boioot.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Boioot.Api.Controllers;

[Route("api/property-amenities")]
public class PropertyAmenitiesController : BaseController
{
    private readonly BoiootDbContext _context;

    public PropertyAmenitiesController(BoiootDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var amenities = await _context.PropertyAmenities
            .Where(a => a.IsActive)
            .OrderBy(a => a.GroupAr)
            .ThenBy(a => a.Order)
            .Select(a => new PropertyAmenityResponse
            {
                Id      = a.Id,
                Key     = a.Key,
                Label   = a.Label,
                GroupAr = a.GroupAr,
                Order   = a.Order,
            })
            .ToListAsync(ct);

        return Ok(amenities);
    }
}
