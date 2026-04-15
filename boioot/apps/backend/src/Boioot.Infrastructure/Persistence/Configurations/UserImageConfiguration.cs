using Boioot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Boioot.Infrastructure.Persistence.Configurations;

public class UserImageConfiguration : IEntityTypeConfiguration<UserImage>
{
    public void Configure(EntityTypeBuilder<UserImage> builder)
    {
        builder.HasKey(i => i.Id);

        builder.Property(i => i.Url)
               .IsRequired()
               .HasColumnType("text");

        builder.Property(i => i.FileKey)
               .IsRequired()
               .HasColumnType("text");

        builder.HasOne(i => i.User)
               .WithMany(u => u.UserImages)
               .HasForeignKey(i => i.UserId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(i => i.UserId);
    }
}
