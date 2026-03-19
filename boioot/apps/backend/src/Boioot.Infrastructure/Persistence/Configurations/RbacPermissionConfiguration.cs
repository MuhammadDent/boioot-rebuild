using Boioot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Boioot.Infrastructure.Persistence.Configurations;

public class RbacPermissionConfiguration : IEntityTypeConfiguration<RbacPermission>
{
    public void Configure(EntityTypeBuilder<RbacPermission> builder)
    {
        builder.ToTable("Permissions");

        builder.HasKey(p => p.Id);

        builder.Property(p => p.Key)
            .IsRequired()
            .HasMaxLength(200);

        builder.HasIndex(p => p.Key)
            .IsUnique();
    }
}
