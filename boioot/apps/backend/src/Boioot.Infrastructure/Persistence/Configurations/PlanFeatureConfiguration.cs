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
            .HasForeignKey(pf => pf.PlanId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(pf => pf.FeatureDefinition)
            .WithMany()
            .HasForeignKey(pf => pf.FeatureDefinitionId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(pf => new { pf.PlanId, pf.FeatureDefinitionId }).IsUnique();
        builder.HasIndex(pf => pf.PlanId);
        builder.HasIndex(pf => pf.FeatureDefinitionId);
    }
}
