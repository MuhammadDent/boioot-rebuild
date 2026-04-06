using Boioot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Boioot.Infrastructure.Persistence.Configurations;

public class AgentConfiguration : IEntityTypeConfiguration<Agent>
{
    public void Configure(EntityTypeBuilder<Agent> builder)
    {
        builder.HasKey(a => a.Id);

        builder.Property(a => a.Bio).HasMaxLength(1000);

        builder.HasOne(a => a.User)
            .WithOne(u => u.Agent)
            .HasForeignKey<Agent>(a => a.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(a => a.Company)
            .WithMany(c => c.Agents)
            .HasForeignKey(a => a.CompanyId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(a => a.UserId).IsUnique();

        builder.HasQueryFilter(a => !a.User.IsDeleted &&
                                    (a.CompanyId == null || !a.Company!.IsDeleted));
    }
}
