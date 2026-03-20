using Boioot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Boioot.Infrastructure.Persistence.Configurations;

public class PropertyAmenityConfiguration : IEntityTypeConfiguration<PropertyAmenity>
{
    public void Configure(EntityTypeBuilder<PropertyAmenity> builder)
    {
        builder.HasKey(a => a.Id);

        builder.Property(a => a.Key).IsRequired().HasMaxLength(100);
        builder.Property(a => a.Label).IsRequired().HasMaxLength(200);
        builder.Property(a => a.GroupAr).HasMaxLength(100).HasDefaultValue(string.Empty);
        builder.Property(a => a.Order).HasDefaultValue(0);
        builder.Property(a => a.IsActive).HasDefaultValue(true);

        builder.HasIndex(a => a.Key).IsUnique();
        builder.HasIndex(a => a.IsActive);
        builder.HasIndex(a => a.Order);
    }
}
