using Boioot.Domain.Enums;

namespace Boioot.Domain.Entities;

public class AccountUser
{
    public Guid AccountId { get; set; }
    public Guid UserId { get; set; }

    public AccountUserRole Role { get; set; } = AccountUserRole.Member;

    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    public Account Account { get; set; } = null!;
    public User User { get; set; } = null!;
}
