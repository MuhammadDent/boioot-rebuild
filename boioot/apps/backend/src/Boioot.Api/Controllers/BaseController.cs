using System.Security.Claims;
using Boioot.Application.Exceptions;
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
            : throw new BoiootException("بيانات المصادقة غير صالحة", 401);
    }

    protected string GetUserRole()
    {
        return User.FindFirstValue(ClaimTypes.Role)
            ?? throw new BoiootException("بيانات المصادقة غير صالحة", 401);
    }
}
