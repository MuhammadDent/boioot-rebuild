using Boioot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Boioot.Infrastructure.Persistence.Configurations;

public class BlogPostCategoryConfiguration : IEntityTypeConfiguration<BlogPostCategory>
{
    public void Configure(EntityTypeBuilder<BlogPostCategory> builder)
    {
        builder.HasKey(bpc => new { bpc.BlogPostId, bpc.BlogCategoryId });

        builder.HasOne(bpc => bpc.BlogPost)
            .WithMany(p => p.BlogPostCategories)
            .HasForeignKey(bpc => bpc.BlogPostId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(bpc => bpc.BlogCategory)
            .WithMany(c => c.BlogPostCategories)
            .HasForeignKey(bpc => bpc.BlogCategoryId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
