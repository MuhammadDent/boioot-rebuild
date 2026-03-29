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
        builder.Property(p => p.Code).HasMaxLength(100);
        builder.HasIndex(p => p.Code).IsUnique().HasFilter("\"Code\" IS NOT NULL");
        builder.Property(p => p.DisplayNameAr).HasMaxLength(100);
        builder.Property(p => p.DisplayNameEn).HasMaxLength(100);
        builder.Property(p => p.AudienceType).HasMaxLength(30);
        builder.Property(p => p.Tier).HasMaxLength(30);
        builder.Property(p => p.Description).HasMaxLength(500);
        builder.Property(p => p.ApplicableAccountType).HasConversion<string>().HasMaxLength(50);
        builder.Property(p => p.Features).HasMaxLength(2000);

        // Map renamed C# properties to existing DB columns (no ALTER TABLE needed)
        builder.Property(p => p.BasePriceMonthly)
            .HasColumnName("PriceMonthly")
            .HasColumnType("decimal(18,2)");

        builder.Property(p => p.BasePriceYearly)
            .HasColumnName("PriceYearly")
            .HasColumnType("decimal(18,2)");

        builder.Property(p => p.ImageLimitPerListing).HasDefaultValue(5);
        builder.Property(p => p.VideoAllowed).HasDefaultValue(false);
        builder.Property(p => p.AnalyticsAccess).HasDefaultValue(false);

        builder.HasIndex(p => p.Name).IsUnique();
        builder.HasIndex(p => p.ApplicableAccountType);
    }
}
