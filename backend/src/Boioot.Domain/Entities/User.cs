using Boioot.Domain.Common;
using Boioot.Domain.Enums;

namespace Boioot.Domain.Entities;

public class User : SoftDeletableEntity
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string? ProfileImageUrl { get; set; }
    public UserRole Role { get; set; } = UserRole.User;
    public UserStatus Status { get; set; } = UserStatus.PendingVerification;
    public bool IsEmailVerified { get; set; } = false;
    public bool IsPhoneVerified { get; set; } = false;
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiresAt { get; set; }
    public string? EmailVerificationToken { get; set; }
    public DateTime? EmailVerificationTokenExpiresAt { get; set; }
    public string? PasswordResetToken { get; set; }
    public DateTime? PasswordResetTokenExpiresAt { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public string? FcmToken { get; set; }
    public string PreferredLanguage { get; set; } = "ar";

    public ICollection<Property> Properties { get; set; } = [];
    public ICollection<PropertyRequest> PropertyRequests { get; set; } = [];
    public ICollection<Favorite> Favorites { get; set; } = [];
    public ICollection<Review> GivenReviews { get; set; } = [];
    public ICollection<Notification> Notifications { get; set; } = [];
    public ICollection<Message> SentMessages { get; set; } = [];
    public ICollection<BlogPost> BlogPosts { get; set; } = [];
    public Agent? Agent { get; set; }
    public Company? OwnedCompany { get; set; }
}
