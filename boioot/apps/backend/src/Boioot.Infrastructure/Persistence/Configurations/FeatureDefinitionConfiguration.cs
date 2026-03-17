using Boioot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Boioot.Infrastructure.Persistence.Configurations;

public class FeatureDefinitionConfiguration : IEntityTypeConfiguration<FeatureDefinition>
{
    public void Configure(EntityTypeBuilder<FeatureDefinition> builder)
    {
        builder.HasKey(f => f.Id);

        builder.Property(f => f.Key)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(f => f.Name)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(f => f.Description)
            .HasMaxLength(500);

        builder.Property(f => f.FeatureGroup)
            .HasMaxLength(100);

        builder.HasIndex(f => f.Key).IsUnique();
        builder.HasIndex(f => f.FeatureGroup);
    }
}
