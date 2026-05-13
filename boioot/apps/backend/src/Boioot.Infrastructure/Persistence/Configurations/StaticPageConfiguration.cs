using Boioot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Boioot.Infrastructure.Persistence.Configurations;

public class StaticPageConfiguration : IEntityTypeConfiguration<StaticPage>
{
    public void Configure(EntityTypeBuilder<StaticPage> builder)
    {
        builder.HasKey(p => p.Id);

        builder.Property(p => p.Slug)
            .IsRequired()
            .HasMaxLength(100);

        builder.HasIndex(p => p.Slug)
            .IsUnique();

        builder.Property(p => p.TitleAr)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(p => p.ContentAr)
            .HasColumnType("text");

        builder.Property(p => p.MetaDescriptionAr)
            .HasMaxLength(500);

        builder.Property(p => p.FooterSection)
            .HasMaxLength(50);

        builder.Property(p => p.IsActive)
            .HasDefaultValue(true);

        builder.Property(p => p.ShowInFooter)
            .HasDefaultValue(false);

        builder.Property(p => p.IsSystem)
            .HasDefaultValue(false);

        builder.Property(p => p.SortOrder)
            .HasDefaultValue(0);

        builder.ToTable("StaticPages");
    }
}
