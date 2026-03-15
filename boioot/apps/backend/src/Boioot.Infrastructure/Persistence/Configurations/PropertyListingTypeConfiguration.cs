using Boioot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Boioot.Infrastructure.Persistence.Configurations;

public class PropertyListingTypeConfiguration : IEntityTypeConfiguration<PropertyListingType>
{
    public void Configure(EntityTypeBuilder<PropertyListingType> builder)
    {
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Value).IsRequired().HasMaxLength(100);
        builder.Property(t => t.Label).IsRequired().HasMaxLength(200);
        builder.Property(t => t.Order).HasDefaultValue(0);
        builder.Property(t => t.IsActive).HasDefaultValue(true);
        builder.HasIndex(t => t.Value).IsUnique();
    }
}
