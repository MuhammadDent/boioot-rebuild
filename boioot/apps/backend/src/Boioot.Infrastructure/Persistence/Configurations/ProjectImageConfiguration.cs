using Boioot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Boioot.Infrastructure.Persistence.Configurations;

public class ProjectImageConfiguration : IEntityTypeConfiguration<ProjectImage>
{
    public void Configure(EntityTypeBuilder<ProjectImage> builder)
    {
        builder.HasKey(i => i.Id);

        builder.Property(i => i.ImageUrl).IsRequired().HasColumnType("text");

        builder.HasOne(i => i.Project)
            .WithMany(p => p.Images)
            .HasForeignKey(i => i.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasQueryFilter(i => !i.Project.IsDeleted);

        builder.HasOne(i => i.UserImage)
               .WithMany(u => u.ProjectImages)
               .HasForeignKey(i => i.UserImageId)
               .OnDelete(DeleteBehavior.SetNull)
               .IsRequired(false);
    }
}
