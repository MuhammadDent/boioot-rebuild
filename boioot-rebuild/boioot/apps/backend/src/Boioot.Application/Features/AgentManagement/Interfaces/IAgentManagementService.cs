using Boioot.Application.Features.AgentManagement.DTOs;

namespace Boioot.Application.Features.AgentManagement.Interfaces;

public interface IAgentManagementService
{
    Task<AgentSummaryResponse> CreateAgentAsync(Guid managerId, string managerRole, CreateAgentRequest request, CancellationToken ct = default);
    Task<List<AgentSummaryResponse>> GetMyAgentsAsync(Guid managerId, string managerRole, CancellationToken ct = default);
    Task DeactivateAgentAsync(Guid managerId, string managerRole, Guid agentUserId, CancellationToken ct = default);
}
