using Boioot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Boioot.Infrastructure.Persistence;

public class BoiootDbContext : DbContext
{
    public BoiootDbContext(DbContextOptions<BoiootDbContext> options) : base(options) { }

    // EF Core 8 changed SQLite GUID storage to BLOB; revert to TEXT to preserve backward compat
    // with the existing database that has all GUIDs stored as lowercase TEXT strings.
    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        // EF Core 8 changed SQLite GUID default storage to BLOB.
        // Force TEXT to stay compatible with the existing database data.
        configurationBuilder.Properties<Guid>().HaveConversion<GuidToStringConverter>();
        base.ConfigureConventions(configurationBuilder);
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Company> Companies => Set<Company>();
    public DbSet<Agent> Agents => Set<Agent>();
    public DbSet<Property> Properties => Set<Property>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<PropertyImage> PropertyImages => Set<PropertyImage>();
    public DbSet<ProjectImage> ProjectImages => Set<ProjectImage>();
    public DbSet<Request> Requests => Set<Request>();
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<Favorite> Favorites => Set<Favorite>();
    public DbSet<BuyerRequest> BuyerRequests => Set<BuyerRequest>();
    public DbSet<BuyerRequestComment> BuyerRequestComments => Set<BuyerRequestComment>();
    public DbSet<PropertyListingType> PropertyListingTypes => Set<PropertyListingType>();
    public DbSet<PropertyTypeConfig> PropertyTypeConfigs => Set<PropertyTypeConfig>();
    public DbSet<OwnershipTypeConfig> OwnershipTypeConfigs => Set<OwnershipTypeConfig>();
    public DbSet<LocationCity> LocationCities => Set<LocationCity>();
    public DbSet<LocationNeighborhood> LocationNeighborhoods => Set<LocationNeighborhood>();

    public DbSet<Plan> Plans => Set<Plan>();
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<AccountUser> AccountUsers => Set<AccountUser>();
    public DbSet<Subscription> Subscriptions => Set<Subscription>();
    public DbSet<SubscriptionHistory> SubscriptionHistories => Set<SubscriptionHistory>();
    public DbSet<FeatureDefinition> FeatureDefinitions => Set<FeatureDefinition>();
    public DbSet<LimitDefinition> LimitDefinitions => Set<LimitDefinition>();
    public DbSet<PlanFeature> PlanFeatures => Set<PlanFeature>();
    public DbSet<PlanLimit> PlanLimits => Set<PlanLimit>();
    public DbSet<PlanPricing> PlanPricings => Set<PlanPricing>();

    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<PaymentProof> PaymentProofs => Set<PaymentProof>();
    public DbSet<SubscriptionPaymentRequest> SubscriptionPaymentRequests => Set<SubscriptionPaymentRequest>();

    public DbSet<PropertyAmenity> PropertyAmenities => Set<PropertyAmenity>();
    public DbSet<PropertyAmenitySelection> PropertyAmenitySelections => Set<PropertyAmenitySelection>();

    public DbSet<BlogCategory> BlogCategories => Set<BlogCategory>();
    public DbSet<BlogPost> BlogPosts => Set<BlogPost>();
    public DbSet<BlogPostCategory> BlogPostCategories => Set<BlogPostCategory>();
    public DbSet<BlogSeoSettings> BlogSeoSettings => Set<BlogSeoSettings>();

    public DbSet<Notification> Notifications => Set<Notification>();

    // ── Auth: Refresh tokens (Phase 1A) ──────────────────────────────────────
    public DbSet<UserRefreshToken> UserRefreshTokens => Set<UserRefreshToken>();
    public DbSet<SiteContent>      SiteContents      => Set<SiteContent>();

    // ── Dynamic RBAC (Phase 1 — infrastructure only, not wired to auth flow yet) ──
    public DbSet<RbacRole>           RbacRoles           => Set<RbacRole>();
    public DbSet<RbacPermission>     RbacPermissions     => Set<RbacPermission>();
    public DbSet<RbacRolePermission> RbacRolePermissions => Set<RbacRolePermission>();
    public DbSet<RbacUserRole>       RbacUserRoles       => Set<RbacUserRole>();

    // ── Verification Requests ──────────────────────────────────────────────────
    public DbSet<VerificationRequest>  VerificationRequests  => Set<VerificationRequest>();
    public DbSet<VerificationDocument> VerificationDocuments => Set<VerificationDocument>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(BoiootDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        SetAuditFields();
        return base.SaveChangesAsync(cancellationToken);
    }

    public override int SaveChanges()
    {
        SetAuditFields();
        return base.SaveChanges();
    }

    private void SetAuditFields()
    {
        var now = DateTime.UtcNow;

        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.Id = entry.Entity.Id == Guid.Empty ? Guid.NewGuid() : entry.Entity.Id;
                entry.Entity.CreatedAt = now;
                entry.Entity.UpdatedAt = now;
            }

            if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = now;
            }
        }
    }
}
