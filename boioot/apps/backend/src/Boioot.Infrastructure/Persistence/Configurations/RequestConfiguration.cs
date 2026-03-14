using Boioot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Boioot.Infrastructure.Persistence.Configurations;

public class RequestConfiguration : IEntityTypeConfiguration<Request>
{
    public void Configure(EntityTypeBuilder<Request> builder)
    {
        builder.HasKey(r => r.Id);

        builder.Property(r => r.Message).HasMaxLength(1000);
        builder.Property(r => r.Status).HasConversion<string>().HasMaxLength(50);

        builder.HasOne(r => r.User)
            .WithMany(u => u.Requests)
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(r => r.Property)
            .WithMany(p => p.Requests)
            .HasForeignKey(r => r.PropertyId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(r => r.Project)
            .WithMany(p => p.Requests)
            .HasForeignKey(r => r.ProjectId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(r => r.UserId);
        builder.HasIndex(r => r.Status);

        builder.HasQueryFilter(r => !r.User.IsDeleted);
    }
}
