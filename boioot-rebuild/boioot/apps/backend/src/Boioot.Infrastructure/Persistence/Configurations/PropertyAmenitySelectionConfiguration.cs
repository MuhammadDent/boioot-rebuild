using Boioot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Boioot.Infrastructure.Persistence.Configurations;

public class PropertyAmenitySelectionConfiguration : IEntityTypeConfiguration<PropertyAmenitySelection>
{
    public void Configure(EntityTypeBuilder<PropertyAmenitySelection> builder)
    {
        builder.HasKey(s => new { s.PropertyId, s.AmenityId });

        builder.HasOne(s => s.Property)
            .WithMany(p => p.AmenitySelections)
            .HasForeignKey(s => s.PropertyId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(s => s.Amenity)
            .WithMany(a => a.Selections)
            .HasForeignKey(s => s.AmenityId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(s => s.PropertyId);
        builder.HasIndex(s => s.AmenityId);
    }
}
