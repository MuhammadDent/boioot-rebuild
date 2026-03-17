using Boioot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Boioot.Infrastructure.Persistence.Configurations;

public class PlanFeatureConfiguration : IEntityTypeConfiguration<PlanFeature>
{
    public void Configure(EntityTypeBuilder<PlanFeature> builder)
    {
        builder.HasKey(pf => pf.Id);

        builder.HasOne(pf => pf.Plan)
            .WithMany(p => p.PlanFeatures)
            .HasForeignKey(pf => pf.SubscriptionPlanId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(pf => pf.FeatureDefinition)
            .WithMany()
            .HasForeignKey(pf => pf.FeatureDefinitionId)
            .OnDelete(DeleteBehavior.Restrict);

        // Composite unique index — also covers leading-column queries on SubscriptionPlanId alone
        builder.HasIndex(pf => new { pf.SubscriptionPlanId, pf.FeatureDefinitionId }).IsUnique();
        // Separate index for reverse lookups: "which plans have feature X"
        builder.HasIndex(pf => pf.FeatureDefinitionId);
    }
}
