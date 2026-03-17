using Boioot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Boioot.Infrastructure.Persistence.Configurations;

public class AccountUserConfiguration : IEntityTypeConfiguration<AccountUser>
{
    public void Configure(EntityTypeBuilder<AccountUser> builder)
    {
        builder.HasKey(au => new { au.AccountId, au.UserId });

        builder.Property(au => au.Role).HasConversion<string>().HasMaxLength(50);

        builder.HasOne(au => au.Account)
            .WithMany(a => a.AccountUsers)
            .HasForeignKey(au => au.AccountId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(au => au.User)
            .WithMany(u => u.AccountUsers)
            .HasForeignKey(au => au.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasQueryFilter(au => !au.Account.OwnerUser.IsDeleted);
    }
}
