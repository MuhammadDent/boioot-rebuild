using Boioot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Boioot.Infrastructure.Persistence.Configurations;

public class VerificationDocumentConfiguration : IEntityTypeConfiguration<VerificationDocument>
{
    public void Configure(EntityTypeBuilder<VerificationDocument> builder)
    {
        builder.HasKey(d => d.Id);

        builder.Property(d => d.DocumentType)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(d => d.Status)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(d => d.FileName)
            .HasMaxLength(500)
            .IsRequired();

        builder.Property(d => d.FileUrl)
            .HasMaxLength(2000)
            .IsRequired();

        builder.Property(d => d.MimeType).HasMaxLength(100);
        builder.Property(d => d.Notes).HasMaxLength(1000);

        builder.HasIndex(d => d.VerificationRequestId);
    }
}
