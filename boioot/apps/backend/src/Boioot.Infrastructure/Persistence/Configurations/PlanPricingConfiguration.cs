using Boioot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Boioot.Infrastructure.Persistence.Configurations;

public class PlanPricingConfiguration : IEntityTypeConfiguration<PlanPricing>
{
    public void Configure(EntityTypeBuilder<PlanPricing> builder)
    {
        builder.Property(p => p.PriceAmount).HasPrecision(18, 4);
    }
}
