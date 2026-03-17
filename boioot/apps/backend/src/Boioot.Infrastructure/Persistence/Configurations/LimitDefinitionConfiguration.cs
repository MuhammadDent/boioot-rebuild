using Boioot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Boioot.Infrastructure.Persistence.Configurations;

public class LimitDefinitionConfiguration : IEntityTypeConfiguration<LimitDefinition>
{
    public void Configure(EntityTypeBuilder<LimitDefinition> builder)
    {
        builder.HasKey(l => l.Id);

        builder.Property(l => l.Key)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(l => l.Name)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(l => l.Description)
            .HasMaxLength(500);

        builder.Property(l => l.Unit)
            .HasMaxLength(50);

        builder.Property(l => l.ValueType)
            .IsRequired()
            .HasMaxLength(50)
            .HasDefaultValue("integer");

        builder.Property(l => l.AppliesToScope)
            .HasMaxLength(100);

        builder.HasIndex(l => l.Key).IsUnique();
        builder.HasIndex(l => l.AppliesToScope);
    }
}
