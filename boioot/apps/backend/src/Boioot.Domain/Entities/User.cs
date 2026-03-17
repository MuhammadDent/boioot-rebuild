using Boioot.Domain.Common;
using Boioot.Domain.Enums;

namespace Boioot.Domain.Entities;

public class User : BaseEntity, ISoftDeletable
{
    public string UserCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.User;
    public bool IsActive { get; set; } = true;
    public bool IsDeleted { get; set; } = false;
    public string? ProfileImageUrl { get; set; }

    public Guid? AccountId { get; set; }

    public Agent? Agent { get; set; }
    public ICollection<Review> Reviews { get; set; } = [];
    public ICollection<AccountUser> AccountUsers { get; set; } = [];
}
