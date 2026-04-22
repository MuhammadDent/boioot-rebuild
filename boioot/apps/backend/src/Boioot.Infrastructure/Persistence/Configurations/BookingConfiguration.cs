using Boioot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Boioot.Infrastructure.Persistence.Configurations;

public class BookingConfiguration : IEntityTypeConfiguration<Booking>
{
    public void Configure(EntityTypeBuilder<Booking> builder)
    {
        builder.HasKey(b => b.Id);

        // The global convention in BoiootDbContext.ConfigureConventions applies
        // GuidToStringConverter to all Guid properties (for SQLite varchar compat).
        // Bookings table uses native PostgreSQL uuid columns for Id, PropertyId,
        // and RequestedByUserId — so we must remove the string converter here
        // and declare the native uuid column type so Npgsql sends them correctly.
        builder.Property(b => b.Id)
            .HasColumnType("uuid")
            .HasConversion<Guid>();
        builder.Property(b => b.PropertyId)
            .HasColumnType("uuid")
            .HasConversion<Guid>();
        builder.Property(b => b.RequestedByUserId)
            .HasColumnType("uuid")
            .HasConversion<Guid>();

        builder.Property(b => b.GuestName).HasMaxLength(120).IsRequired();
        builder.Property(b => b.Phone).HasMaxLength(40);
        builder.Property(b => b.Notes).HasMaxLength(1000);
        builder.Property(b => b.PricePerNight).HasPrecision(18, 2);
        builder.Property(b => b.TotalAmount).HasPrecision(18, 2);
        builder.Property(b => b.CommissionPercent).HasPrecision(5, 2);
        builder.Property(b => b.CommissionAmount).HasPrecision(18, 2);
        builder.Property(b => b.PaymentStatus).HasMaxLength(30).HasDefaultValue("NotPaid").IsRequired();
        builder.Property(b => b.Status).HasMaxLength(30).HasDefaultValue("Pending").IsRequired();
        builder.Property(b => b.PropertyOwnerUserId).HasMaxLength(80);
        builder.HasIndex(b => b.PropertyId);
        builder.HasIndex(b => b.RequestedByUserId);
        builder.HasIndex(b => new { b.PropertyId, b.StartDate, b.EndDate });
        builder.HasIndex(b => new { b.PropertyId, b.Status, b.StartDate, b.EndDate });
    }
}
