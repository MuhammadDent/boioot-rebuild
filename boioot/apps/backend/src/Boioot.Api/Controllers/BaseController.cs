using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

[ApiController]
public abstract class BaseController : ControllerBase
{
    protected Guid GetUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(claim, out var id)
            ? id
            : throw new InvalidOperationException("User ID claim is missing or invalid");
    }

    protected string GetUserRole()
    {
        return User.FindFirstValue(ClaimTypes.Role)
            ?? throw new InvalidOperationException("Role claim is missing");
    }
}
