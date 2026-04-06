using Boioot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Boioot.Infrastructure.Persistence.Configurations;

public class BlogSeoSettingsConfiguration : IEntityTypeConfiguration<BlogSeoSettings>
{
    public void Configure(EntityTypeBuilder<BlogSeoSettings> builder)
    {
        builder.ToTable("BlogSeoSettings");
        builder.HasKey(s => s.Id);

        builder.Property(s => s.SiteName)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(s => s.DefaultPostSeoTitleTemplate)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(s => s.DefaultPostSeoDescriptionTemplate)
            .IsRequired()
            .HasMaxLength(1000);

        builder.Property(s => s.DefaultBlogListSeoTitle)
            .IsRequired()
            .HasMaxLength(300);

        builder.Property(s => s.DefaultBlogListSeoDescription)
            .IsRequired()
            .HasMaxLength(1000);
    }
}
