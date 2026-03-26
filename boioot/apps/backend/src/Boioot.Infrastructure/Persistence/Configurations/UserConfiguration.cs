using Boioot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Boioot.Infrastructure.Persistence.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.HasKey(u => u.Id);

        builder.Property(u => u.UserCode).IsRequired().HasMaxLength(20);
        builder.HasIndex(u => u.UserCode).IsUnique();

        builder.Property(u => u.FullName).IsRequired().HasMaxLength(150);
        builder.Property(u => u.Email).IsRequired().HasMaxLength(200);
        builder.Property(u => u.Phone).HasMaxLength(30);
        builder.Property(u => u.Role).HasConversion<string>().HasMaxLength(50);

        // Multi-level verification enums — stored as TEXT strings
        builder.Property(u => u.VerificationStatus).HasConversion<string>().HasMaxLength(30);
        builder.Property(u => u.IdentityVerificationStatus).HasConversion<string>().HasMaxLength(30);
        builder.Property(u => u.BusinessVerificationStatus).HasConversion<string>().HasMaxLength(30);

        builder.HasIndex(u => u.Email).IsUnique();

        builder.HasQueryFilter(u => !u.IsDeleted);
    }
}
