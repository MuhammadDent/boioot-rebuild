using Boioot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Boioot.Infrastructure.Persistence.Configurations;

public class SubscriptionHistoryConfiguration : IEntityTypeConfiguration<SubscriptionHistory>
{
    public void Configure(EntityTypeBuilder<SubscriptionHistory> builder)
    {
        builder.HasKey(h => h.Id);

        builder.Property(h => h.EventType).IsRequired().HasMaxLength(50);
        builder.Property(h => h.Notes).HasMaxLength(1000);

        builder.HasOne(h => h.Subscription)
            .WithMany(s => s.History)
            .HasForeignKey(h => h.SubscriptionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(h => h.OldPlan)
            .WithMany()
            .HasForeignKey(h => h.OldPlanId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(h => h.NewPlan)
            .WithMany()
            .HasForeignKey(h => h.NewPlanId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(h => h.CreatedByUser)
            .WithMany()
            .HasForeignKey(h => h.CreatedByUserId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(h => h.SubscriptionId);
        builder.HasIndex(h => h.CreatedAtUtc);
    }
}
