using Boioot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Boioot.Infrastructure.Persistence.Configurations;

public class BlogPostConfiguration : IEntityTypeConfiguration<BlogPost>
{
    public void Configure(EntityTypeBuilder<BlogPost> builder)
    {
        builder.HasKey(b => b.Id);
        builder.Property(b => b.TitleAr).IsRequired().HasMaxLength(500);
        builder.Property(b => b.TitleEn).IsRequired().HasMaxLength(500);
        builder.Property(b => b.Slug).IsRequired().HasMaxLength(600);
        builder.HasIndex(b => b.Slug).IsUnique();

        builder.HasQueryFilter(b => !b.IsDeleted);

        builder.HasOne(b => b.Author)
            .WithMany(u => u.BlogPosts)
            .HasForeignKey(b => b.AuthorId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
