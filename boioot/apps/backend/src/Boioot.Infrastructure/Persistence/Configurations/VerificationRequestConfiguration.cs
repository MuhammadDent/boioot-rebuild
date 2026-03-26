using Boioot.Domain.Entities;
using Boioot.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Boioot.Infrastructure.Persistence.Configurations;

public class VerificationRequestConfiguration : IEntityTypeConfiguration<VerificationRequest>
{
    public void Configure(EntityTypeBuilder<VerificationRequest> builder)
    {
        builder.HasKey(r => r.Id);

        builder.Property(r => r.VerificationType)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(r => r.Status)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(r => r.UserNotes).HasMaxLength(2000);
        builder.Property(r => r.AdminNotes).HasMaxLength(2000);
        builder.Property(r => r.RejectionReason).HasMaxLength(2000);
        builder.Property(r => r.ReviewedBy).HasMaxLength(200);

        builder.HasOne(r => r.User)
            .WithMany()
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(r => r.Documents)
            .WithOne(d => d.VerificationRequest)
            .HasForeignKey(d => d.VerificationRequestId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(r => r.UserId);
        builder.HasIndex(r => r.Status);
        builder.HasIndex(r => r.CreatedAt);
    }
}
