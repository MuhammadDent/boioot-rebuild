using Boioot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Boioot.Infrastructure.Persistence.Configurations;

public class BookingConfiguration : IEntityTypeConfiguration<Booking>
{
    public void Configure(EntityTypeBuilder<Booking> builder)
    {
        builder.HasKey(b => b.Id);
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