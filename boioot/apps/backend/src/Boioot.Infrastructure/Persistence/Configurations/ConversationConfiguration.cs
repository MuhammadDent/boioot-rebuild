using Boioot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Boioot.Infrastructure.Persistence.Configurations;

public class ConversationConfiguration : IEntityTypeConfiguration<Conversation>
{
    public void Configure(EntityTypeBuilder<Conversation> builder)
    {
        builder.HasKey(c => c.Id);

        builder.HasOne(c => c.User1)
            .WithMany()
            .HasForeignKey(c => c.User1Id)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(c => c.User2)
            .WithMany()
            .HasForeignKey(c => c.User2Id)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(c => c.Property)
            .WithMany()
            .HasForeignKey(c => c.PropertyId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(c => c.Project)
            .WithMany()
            .HasForeignKey(c => c.ProjectId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(c => c.User1Id);
        builder.HasIndex(c => c.User2Id);
        builder.HasIndex(c => c.LastMessageAt);

        // Use a direct-property filter rather than a navigation-property filter.
        // Navigation-property filters interact with the User's own HasQueryFilter
        // (which also gates on IsDeleted) causing EF Core to return null User1/User2
        // navigation properties via Include() while the conversation itself is still
        // in the result set — leading to NullReferenceException in MapToSummary.
        // Filtering deleted conversations is handled explicitly in MessagingService
        // queries (WHERE User1Id / User2Id) so this global filter is not needed.
        // Left as a no-op override to document the intentional removal.
    }
}
