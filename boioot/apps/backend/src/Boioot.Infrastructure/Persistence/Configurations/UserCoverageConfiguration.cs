using Boioot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Boioot.Infrastructure.Persistence.Configurations;

public class UserCoverageConfiguration : IEntityTypeConfiguration<UserCoverage>
{
    public void Configure(EntityTypeBuilder<UserCoverage> builder)
    {
        builder.ToTable("UserCoverages");

        builder.HasKey(uc => uc.Id);

        builder.Property(uc => uc.CoverageType)
            .IsRequired()
            .HasMaxLength(20)
            .HasDefaultValue("city_wide");

        builder.Property(uc => uc.Province)
            .HasMaxLength(100);

        // ── Foreign keys ──────────────────────────────────────────────────────

        builder.HasOne(uc => uc.User)
            .WithMany()
            .HasForeignKey(uc => uc.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // CityId is nullable — null for province_wide coverage
        builder.HasOne(uc => uc.City)
            .WithMany()
            .HasForeignKey(uc => uc.CityId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(uc => uc.Neighborhood)
            .WithMany()
            .HasForeignKey(uc => uc.NeighborhoodId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);

        // ── Indexes ───────────────────────────────────────────────────────────

        builder.HasIndex(uc => uc.UserId)
            .HasDatabaseName("IX_UserCoverages_UserId");

        // Unique index covers city_wide / custom entries (CityId-based).
        // province_wide duplicates are prevented in application code since
        // PostgreSQL treats NULL CityId values as distinct in unique indexes.
        builder.HasIndex(uc => new { uc.UserId, uc.CityId, uc.CoverageType, uc.NeighborhoodId })
            .IsUnique()
            .HasDatabaseName("IX_UserCoverages_Unique");
    }
}
