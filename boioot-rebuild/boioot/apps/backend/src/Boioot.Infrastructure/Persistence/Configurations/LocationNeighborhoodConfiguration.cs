using Boioot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Boioot.Infrastructure.Persistence.Configurations;

public class LocationNeighborhoodConfiguration : IEntityTypeConfiguration<LocationNeighborhood>
{
    public void Configure(EntityTypeBuilder<LocationNeighborhood> builder)
    {
        builder.HasKey(n => n.Id);
        builder.Property(n => n.Name).IsRequired().HasMaxLength(200);
        builder.Property(n => n.NormalizedName).IsRequired().HasMaxLength(200).HasDefaultValue("");
        builder.Property(n => n.City).IsRequired().HasMaxLength(200);
        builder.Property(n => n.IsActive).IsRequired().HasDefaultValue(true);
        // Unique index (City, NormalizedName) is enforced via raw SQL in Program.cs
        // to work on both fresh and migrated databases.
    }
}
