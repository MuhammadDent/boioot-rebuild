using Boioot.Domain.Enums;

namespace Boioot.Domain.Entities;

public class User : BaseEntity
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.User;
    public bool IsActive { get; set; } = true;
    public bool IsDeleted { get; set; } = false;

    public Agent? Agent { get; set; }
    public ICollection<Request> Requests { get; set; } = [];
    public ICollection<Review> Reviews { get; set; } = [];
}
