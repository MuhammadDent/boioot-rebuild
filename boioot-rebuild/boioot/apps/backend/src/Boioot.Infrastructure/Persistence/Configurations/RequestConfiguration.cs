using Boioot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Boioot.Infrastructure.Persistence.Configurations;

public class RequestConfiguration : IEntityTypeConfiguration<Request>
{
    public void Configure(EntityTypeBuilder<Request> builder)
    {
        builder.HasKey(r => r.Id);

        builder.Property(r => r.Name).IsRequired().HasMaxLength(200);
        builder.Property(r => r.Phone).IsRequired().HasMaxLength(50);
        builder.Property(r => r.Email).HasMaxLength(200);
        builder.Property(r => r.Message).HasMaxLength(2000);
        builder.Property(r => r.Status).HasConversion<string>().HasMaxLength(50);

        builder.HasOne(r => r.Property)
            .WithMany(p => p.Requests)
            .HasForeignKey(r => r.PropertyId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(r => r.Project)
            .WithMany(p => p.Requests)
            .HasForeignKey(r => r.ProjectId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(r => r.Status);
        builder.HasIndex(r => r.PropertyId);
        builder.HasIndex(r => r.ProjectId);
        builder.HasIndex(r => r.CreatedAt);
    }
}
