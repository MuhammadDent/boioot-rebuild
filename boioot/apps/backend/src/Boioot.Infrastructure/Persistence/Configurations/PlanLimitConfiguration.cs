using Boioot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Boioot.Infrastructure.Persistence.Configurations;

public class PlanLimitConfiguration : IEntityTypeConfiguration<PlanLimit>
{
    public void Configure(EntityTypeBuilder<PlanLimit> builder)
    {
        builder.HasKey(pl => pl.Id);

        builder.Property(pl => pl.Value)
            .HasColumnType("decimal(18,4)");

        builder.HasOne(pl => pl.Plan)
            .WithMany(p => p.PlanLimits)
            .HasForeignKey(pl => pl.SubscriptionPlanId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(pl => pl.LimitDefinition)
            .WithMany()
            .HasForeignKey(pl => pl.LimitDefinitionId)
            .OnDelete(DeleteBehavior.Restrict);

        // Composite unique index — one limit value per (plan, limit type)
        builder.HasIndex(pl => new { pl.SubscriptionPlanId, pl.LimitDefinitionId }).IsUnique();
        // Most common query: "get all limits for this plan"
        builder.HasIndex(pl => pl.SubscriptionPlanId);
        // Reverse lookup: "which plans define this limit"
        builder.HasIndex(pl => pl.LimitDefinitionId);
    }
}
