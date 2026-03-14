using Boioot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Boioot.Infrastructure.Persistence.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.HasKey(u => u.Id);
        builder.Property(u => u.Email).IsRequired().HasMaxLength(256);
        builder.HasIndex(u => u.Email).IsUnique();
        builder.Property(u => u.FullName).IsRequired().HasMaxLength(200);
        builder.Property(u => u.PhoneNumber).HasMaxLength(20);
        builder.Property(u => u.PasswordHash).IsRequired();
        builder.Property(u => u.PreferredLanguage).HasMaxLength(5).HasDefaultValue("ar");

        builder.HasQueryFilter(u => !u.IsDeleted);

        builder.HasOne(u => u.Agent)
            .WithOne(a => a.User)
            .HasForeignKey<Agent>(a => a.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(u => u.OwnedCompany)
            .WithOne(c => c.Owner)
            .HasForeignKey<Company>(c => c.OwnerId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
