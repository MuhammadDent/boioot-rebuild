using Boioot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Boioot.Infrastructure.Persistence.Configurations;

public class SiteContentConfiguration : IEntityTypeConfiguration<SiteContent>
{
    public void Configure(EntityTypeBuilder<SiteContent> builder)
    {
        builder.HasKey(c => c.Id);

        builder.Property(c => c.Key)
            .IsRequired()
            .HasMaxLength(200);

        builder.HasIndex(c => c.Key)
            .IsUnique();

        builder.Property(c => c.Group)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(c => c.Type)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(c => c.LabelAr)
            .IsRequired()
            .HasMaxLength(300);

        builder.Property(c => c.LabelEn)
            .HasMaxLength(300);

        builder.Property(c => c.ValueAr)
            .HasMaxLength(4000);

        builder.Property(c => c.ValueEn)
            .HasMaxLength(4000);

        builder.Property(c => c.IsActive)
            .HasDefaultValue(true);

        builder.Property(c => c.IsSystem)
            .HasDefaultValue(false);

        builder.Property(c => c.SortOrder)
            .HasDefaultValue(0);
    }
}
