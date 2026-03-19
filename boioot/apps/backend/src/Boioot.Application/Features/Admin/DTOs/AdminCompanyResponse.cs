namespace Boioot.Application.Features.Admin.DTOs;

public class AdminCompanyResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? LogoUrl { get; set; }
    public bool IsVerified { get; set; }
    public bool IsDeleted { get; set; }
    public int AgentCount { get; set; }
    public int PropertyCount { get; set; }
    public int ProjectCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
