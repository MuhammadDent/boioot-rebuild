using Boioot.Domain.Common;
using Boioot.Domain.Enums;

namespace Boioot.Domain.Entities;

public class Review : SoftDeletableEntity
{
    public int Rating { get; set; }
    public string? CommentAr { get; set; }
    public string? CommentEn { get; set; }
    public ReviewTargetType TargetType { get; set; }
    public bool IsApproved { get; set; } = true;

    public Guid ReviewerId { get; set; }
    public User Reviewer { get; set; } = null!;

    public Guid? AgentId { get; set; }
    public Agent? Agent { get; set; }

    public Guid? CompanyId { get; set; }
    public Company? Company { get; set; }
}
