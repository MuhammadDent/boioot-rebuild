namespace Boioot.Application.Features.Requests.DTOs;

public class RequestResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Message { get; set; }
    public string Status { get; set; } = string.Empty;

    public Guid? PropertyId { get; set; }
    public string? PropertyTitle { get; set; }

    public Guid? ProjectId { get; set; }
    public string? ProjectTitle { get; set; }

    public Guid? CompanyId { get; set; }
    public string? CompanyName { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
