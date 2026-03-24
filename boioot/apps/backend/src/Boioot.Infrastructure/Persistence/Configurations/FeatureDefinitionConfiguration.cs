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

        builder.Property(f => f.Type)
            .IsRequired()
            .HasMaxLength(50)
            .HasDefaultValue("boolean");

        builder.Property(f => f.Scope)
            .IsRequired()
            .HasMaxLength(50)
            .HasDefaultValue("system");

        builder.Property(f => f.IsSystem)
            .HasDefaultValue(false);

        builder.Property(f => f.SortOrder)
            .HasDefaultValue(0);

        builder.HasIndex(f => f.Key).IsUnique();
        builder.HasIndex(f => f.FeatureGroup);
        builder.HasIndex(f => new { f.Scope, f.SortOrder });
    }
}
