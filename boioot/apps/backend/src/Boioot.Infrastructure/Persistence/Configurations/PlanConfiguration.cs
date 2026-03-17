using Boioot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Boioot.Infrastructure.Persistence.Configurations;

public class PlanConfiguration : IEntityTypeConfiguration<Plan>
{
    public void Configure(EntityTypeBuilder<Plan> builder)
    {
        builder.HasKey(p => p.Id);

        builder.Property(p => p.Name).IsRequired().HasMaxLength(100);
        builder.Property(p => p.PriceMonthly).HasColumnType("decimal(18,2)");
        builder.Property(p => p.PriceYearly).HasColumnType("decimal(18,2)");
        builder.Property(p => p.Features).HasMaxLength(2000);

        builder.Property(p => p.ImageLimitPerListing).HasDefaultValue(5);
        builder.Property(p => p.VideoAllowed).HasDefaultValue(false);
        builder.Property(p => p.AnalyticsAccess).HasDefaultValue(false);

        builder.HasIndex(p => p.Name).IsUnique();
    }
}
