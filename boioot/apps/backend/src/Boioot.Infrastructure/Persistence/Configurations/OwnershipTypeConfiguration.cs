using Boioot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Boioot.Infrastructure.Persistence.Configurations;

/// <summary>
/// Ensures the Id is stored/queried as TEXT (lowercase UUID string with hyphens)
/// in SQLite, matching the format used by the raw-SQL seeder.
/// Without this, EF Core 6+ / Microsoft.Data.Sqlite passes Guid parameters as
/// BLOB, which does not match the seeded TEXT values.
/// </summary>
public class OwnershipTypeConfiguration : IEntityTypeConfiguration<OwnershipTypeConfig>
{
    public void Configure(EntityTypeBuilder<OwnershipTypeConfig> builder)
    {
        builder.Property(e => e.Id)
               .HasConversion<string>();
    }
}
