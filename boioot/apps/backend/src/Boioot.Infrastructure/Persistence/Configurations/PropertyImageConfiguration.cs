using Boioot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Boioot.Infrastructure.Persistence.Configurations;

public class PropertyImageConfiguration : IEntityTypeConfiguration<PropertyImage>
{
    public void Configure(EntityTypeBuilder<PropertyImage> builder)
    {
        builder.HasKey(i => i.Id);

        builder.Property(i => i.ImageUrl).IsRequired().HasColumnType("text");
        builder.Property(i => i.IsCover).HasDefaultValue(false);

        builder.HasOne(i => i.Property)
            .WithMany(p => p.Images)
            .HasForeignKey(i => i.PropertyId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasQueryFilter(i => !i.Property.IsDeleted);

        builder.HasOne(i => i.UserImage)
               .WithMany(u => u.PropertyImages)
               .HasForeignKey(i => i.UserImageId)
               .OnDelete(DeleteBehavior.SetNull)
               .IsRequired(false);
    }
}
