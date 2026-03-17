using Boioot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Boioot.Infrastructure.Persistence.Configurations;

public class AccountConfiguration : IEntityTypeConfiguration<Account>
{
    public void Configure(EntityTypeBuilder<Account> builder)
    {
        builder.HasKey(a => a.Id);

        builder.Property(a => a.Name).IsRequired().HasMaxLength(200);
        builder.Property(a => a.AccountType).HasConversion<string>().HasMaxLength(50);

        builder.HasOne(a => a.OwnerUser)
            .WithMany()
            .HasForeignKey(a => a.OwnerUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(a => a.Plan)
            .WithMany(p => p.Accounts)
            .HasForeignKey(a => a.PlanId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(a => a.OwnerUserId).IsUnique();
        builder.HasIndex(a => a.AccountType);
    }
}
