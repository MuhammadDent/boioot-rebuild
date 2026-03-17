using Boioot.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Boioot.Infrastructure.Persistence;

public class BoiootDbContext : DbContext
{
    public BoiootDbContext(DbContextOptions<BoiootDbContext> options) : base(options) { }

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
