using Boioot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Boioot.Infrastructure.Persistence.Configurations;

public class LocationCityConfiguration : IEntityTypeConfiguration<LocationCity>
{
    public void Configure(EntityTypeBuilder<LocationCity> builder)
    {
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Name).IsRequired().HasMaxLength(200);
        builder.Property(c => c.Province).HasMaxLength(200);
        builder.HasIndex(c => c.Name).IsUnique();
    }
}
