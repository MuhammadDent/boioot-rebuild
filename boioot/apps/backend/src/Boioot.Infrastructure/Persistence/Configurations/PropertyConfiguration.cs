using Boioot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Boioot.Infrastructure.Persistence.Configurations;

public class PropertyConfiguration : IEntityTypeConfiguration<Property>
{
    public void Configure(EntityTypeBuilder<Property> builder)
    {
        builder.HasKey(p => p.Id);

        builder.Property(p => p.Title).IsRequired().HasMaxLength(300);
        builder.Property(p => p.Description).HasMaxLength(3000);
        builder.Property(p => p.Type).HasConversion<string>().HasMaxLength(50);
        builder.Property(p => p.ListingType).HasConversion<string>().HasMaxLength(50);
        builder.Property(p => p.Status).HasConversion<string>().HasMaxLength(50);
        builder.Property(p => p.Price).HasColumnType("decimal(18,2)");
        builder.Property(p => p.Area).HasColumnType("decimal(10,2)");
        builder.Property(p => p.Address).HasMaxLength(300);
        builder.Property(p => p.City).IsRequired().HasMaxLength(100);

        builder.HasOne(p => p.Company)
            .WithMany(c => c.Properties)
            .HasForeignKey(p => p.CompanyId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(p => p.Agent)
            .WithMany(a => a.Properties)
            .HasForeignKey(p => p.AgentId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(p => p.City);
        builder.HasIndex(p => p.Status);
        builder.HasIndex(p => p.Type);
        builder.HasIndex(p => p.CreatedAt);

        builder.HasQueryFilter(p => !p.IsDeleted && !p.Company.IsDeleted);
    }
}
