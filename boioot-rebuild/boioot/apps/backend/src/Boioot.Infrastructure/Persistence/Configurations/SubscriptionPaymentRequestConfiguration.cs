using Boioot.Domain.Entities;
using Boioot.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Boioot.Infrastructure.Persistence.Configurations;

public class SubscriptionPaymentRequestConfiguration
    : IEntityTypeConfiguration<SubscriptionPaymentRequest>
{
    public void Configure(EntityTypeBuilder<SubscriptionPaymentRequest> builder)
    {
        builder.HasKey(r => r.Id);

        // Status stored as string for DB readability and forward-compatibility
        builder.Property(r => r.Status)
               .HasConversion<string>()
               .HasMaxLength(50);

        builder.Property(r => r.PaymentMethod)  .HasMaxLength(50).IsRequired();
        builder.Property(r => r.PaymentFlowType).HasMaxLength(20).IsRequired();
        builder.Property(r => r.BillingCycle)   .HasMaxLength(20).IsRequired();
        builder.Property(r => r.Currency)       .HasMaxLength(10).IsRequired();
        builder.Property(r => r.Amount)         .HasPrecision(18, 4);

        builder.Property(r => r.ReceiptImageUrl)         .HasMaxLength(2000);
        builder.Property(r => r.ReceiptFileName)         .HasMaxLength(300);
        builder.Property(r => r.CustomerNote)            .HasMaxLength(1000);
        builder.Property(r => r.SalesRepresentativeName) .HasMaxLength(200);
        builder.Property(r => r.ReviewNote)              .HasMaxLength(1000);
        builder.Property(r => r.ExternalPaymentReference).HasMaxLength(500);

        // Relationships
        builder.HasOne(r => r.Account)
               .WithMany()
               .HasForeignKey(r => r.AccountId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(r => r.Plan)
               .WithMany()
               .HasForeignKey(r => r.RequestedPlanId)
               .OnDelete(DeleteBehavior.Restrict);

        // Indexes for common admin queries
        builder.HasIndex(r => r.AccountId);
        builder.HasIndex(r => r.Status);
        builder.HasIndex(r => r.PaymentMethod);
        builder.HasIndex(r => r.PaymentFlowType);
        builder.HasIndex(r => r.CreatedAt);
    }
}
