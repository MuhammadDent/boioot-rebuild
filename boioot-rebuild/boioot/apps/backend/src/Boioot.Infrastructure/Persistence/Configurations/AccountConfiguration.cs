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

        // CreatedByUserId — required audit FK (who created this account)
        builder.HasOne(a => a.CreatedByUser)
            .WithMany()
            .HasForeignKey(a => a.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        // PrimaryAdminUserId — optional FK (current primary admin, can be reassigned)
        builder.HasOne(a => a.PrimaryAdminUser)
            .WithMany()
            .HasForeignKey(a => a.PrimaryAdminUserId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(a => a.Plan)
            .WithMany(p => p.Accounts)
            .HasForeignKey(a => a.PlanId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(a => a.CreatedByUserId);
        builder.HasIndex(a => a.AccountType);

        // Mirror User's soft-delete filter to prevent EF warning 10622
        builder.HasQueryFilter(a => !a.CreatedByUser.IsDeleted);
    }
}
