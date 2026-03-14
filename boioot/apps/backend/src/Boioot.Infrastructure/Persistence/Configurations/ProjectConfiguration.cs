using Boioot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Boioot.Infrastructure.Persistence.Configurations;

public class ProjectConfiguration : IEntityTypeConfiguration<Project>
{
    public void Configure(EntityTypeBuilder<Project> builder)
    {
        builder.HasKey(p => p.Id);

        builder.Property(p => p.Title).IsRequired().HasMaxLength(300);
        builder.Property(p => p.Description).HasMaxLength(3000);
        builder.Property(p => p.Status).HasConversion<string>().HasMaxLength(50);
        builder.Property(p => p.City).IsRequired().HasMaxLength(100);
        builder.Property(p => p.Address).HasMaxLength(300);
        builder.Property(p => p.StartingPrice).HasColumnType("decimal(18,2)");
        builder.Property(p => p.IsPublished).HasDefaultValue(false);

        builder.HasOne(p => p.Company)
            .WithMany(c => c.Projects)
            .HasForeignKey(p => p.CompanyId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(p => p.City);
        builder.HasIndex(p => p.Status);
        builder.HasIndex(p => p.IsPublished);
        builder.HasIndex(p => p.CreatedAt);

        builder.HasQueryFilter(p => !p.IsDeleted && !p.Company.IsDeleted);
    }
}
