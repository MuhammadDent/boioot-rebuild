using Boioot.Application.Features.AgentManagement.DTOs;
using Boioot.Application.Features.AgentManagement.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

[Route("api/agents")]
[Authorize(Policy = "BrokerOrCompanyOwner")]
public class AgentManagementController : BaseController
{
    private readonly IAgentManagementService _service;

    public AgentManagementController(IAgentManagementService service)
    {
        _service = service;
    }

    /// <summary>
    /// جلب قائمة وكلاء المكتب / الشركة
    /// </summary>
    [HttpGet("my-agents")]
    public async Task<IActionResult> GetMyAgents(CancellationToken ct)
    {
        var result = await _service.GetMyAgentsAsync(GetUserId(), GetUserRole(), ct);
        return Ok(result);
    }

    /// <summary>
    /// إنشاء وكيل جديد تابع للمكتب / الشركة
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateAgent([FromBody] CreateAgentRequest request, CancellationToken ct)
    {
        var result = await _service.CreateAgentAsync(GetUserId(), GetUserRole(), request, ct);
        return Ok(result);
    }

    /// <summary>
    /// تفعيل / إيقاف وكيل
    /// </summary>
    [HttpPatch("{agentUserId:guid}/toggle-active")]
    public async Task<IActionResult> ToggleActive(Guid agentUserId, CancellationToken ct)
    {
        await _service.DeactivateAgentAsync(GetUserId(), GetUserRole(), agentUserId, ct);
        return Ok(new { message = "تم تحديث حالة الوكيل" });
    }
}
