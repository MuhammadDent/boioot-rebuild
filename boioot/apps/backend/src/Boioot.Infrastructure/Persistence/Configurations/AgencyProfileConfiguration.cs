using Boioot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Boioot.Infrastructure.Persistence.Configurations;

public class AgencyProfileConfiguration : IEntityTypeConfiguration<AgencyProfile>
{
    public void Configure(EntityTypeBuilder<AgencyProfile> builder)
    {
        builder.ToTable("AgencyProfiles");
        builder.HasKey(a => a.UserId);

        builder.Property(a => a.UserId).HasMaxLength(36);
        builder.Property(a => a.Bio).HasMaxLength(2000);
        builder.Property(a => a.City).HasMaxLength(200);
        builder.Property(a => a.LogoUrl).HasMaxLength(1000);

        // No FK relationship — UserId (string) vs User.Id (Guid) are incompatible
        // for EF Core FK. Joins are done manually in controllers.
    }
}
