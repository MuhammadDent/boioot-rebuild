using Boioot.Application.Common.Services;
using Boioot.Application.Features.Billing.Interfaces;
using Boioot.Application.Features.Billing.Settings;
using Boioot.Application.Features.Admin.Interfaces;
using Boioot.Application.Features.VerificationRequests.Interfaces;
using Boioot.Infrastructure.Features.VerificationRequests;
using Boioot.Application.Features.AgentManagement.Interfaces;
using Boioot.Application.Features.Auth.Interfaces;
using Boioot.Application.Features.Blog.Interfaces;
using Boioot.Application.Features.Content.Interfaces;
using Boioot.Application.Features.Locations.Interfaces;
using Boioot.Application.Features.Onboarding.Interfaces;
using Boioot.Application.Features.BuyerRequests.Interfaces;
using Boioot.Application.Features.SpecialRequests.Interfaces;
using Boioot.Application.Features.Dashboard.Interfaces;
using Boioot.Application.Features.Favorites.Interfaces;
using Boioot.Application.Features.Messaging.Interfaces;
using Boioot.Application.Features.Notifications.Interfaces;
using Boioot.Infrastructure.Features.Notifications;
using Boioot.Application.Features.Plans.Interfaces;
using Boioot.Application.Features.Pricing.Interfaces;
using Boioot.Application.Features.Projects.Interfaces;
using Boioot.Application.Features.Properties.Interfaces;
using Boioot.Application.Features.Requests.Interfaces;
using Boioot.Application.Features.Subscriptions.Interfaces;
using Boioot.Application.Features.SubscriptionPayments.Interfaces;
using Boioot.Infrastructure.Features.SubscriptionPayments;
using Boioot.Infrastructure.Common;
using Boioot.Infrastructure.Features.Admin;
using Boioot.Infrastructure.Features.AgentManagement;
using Boioot.Infrastructure.Features.Auth;
using Boioot.Infrastructure.Features.Onboarding;
using Boioot.Infrastructure.Features.Rbac;
using Boioot.Infrastructure.Features.Billing;
using Boioot.Infrastructure.Features.Blog;
using Boioot.Infrastructure.Features.Content;
using Boioot.Infrastructure.Features.Locations;
using Boioot.Infrastructure.Features.BuyerRequests;
using Boioot.Infrastructure.Features.SpecialRequests;
using Boioot.Infrastructure.Features.Dashboard;
using Boioot.Infrastructure.Features.Favorites;
using Boioot.Infrastructure.Features.Messaging;
using Boioot.Infrastructure.Features.Plans;
using Boioot.Infrastructure.Features.Pricing;
using Boioot.Infrastructure.Features.Projects;
using Boioot.Infrastructure.Features.Properties;
using Boioot.Infrastructure.Features.Requests;
using Boioot.Infrastructure.Features.Subscriptions;
using Boioot.Infrastructure.Persistence;
using Boioot.Infrastructure.Persistence.Seeding;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Boioot.Infrastructure.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // ── Database provider ─────────────────────────────────────────────────
        // Switch between providers via config only:
        //
        //   appsettings.json:
        //     "Database": { "Provider": "SQLite" }        ← default (dev)
        //     "Database": { "Provider": "PostgreSQL" }    ← production
        //     "Database": { "Provider": "SqlServer" }     ← SQL Server (legacy)
        //
        //   Connection strings:
        //     "DefaultConnection"    — SQLite file path
        //     "SqlServerConnection"  — SQL Server (falls back to DefaultConnection)
        //     "Postgres"             — Explicit Npgsql connection string
        //                             Falls back to DATABASE_URL environment variable
        var dbProvider = configuration["Database:Provider"] ?? "SQLite";

        services.AddDbContext<BoiootDbContext>(options =>
        {
            if (dbProvider.Equals("PostgreSQL", StringComparison.OrdinalIgnoreCase))
            {
                var connStr = ResolvePostgresConnectionString(configuration);
                options.UseNpgsql(connStr);
            }
            else if (dbProvider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
            {
                var connStr = configuration.GetConnectionString("SqlServerConnection")
                              ?? configuration.GetConnectionString("DefaultConnection");
                options.UseSqlServer(connStr);
            }
            else
            {
                var connStr = configuration.GetConnectionString("DefaultConnection");
                options.UseSqlite(connStr);
            }
        });

        // Expose the provider name so startup code can gate SQLite-specific SQL
        services.AddSingleton<DbProviderInfo>(new DbProviderInfo(dbProvider));

        services.AddScoped<ICompanyOwnershipService, CompanyOwnershipService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IOnboardingService, OnboardingService>();
        services.AddScoped<IPropertyService, PropertyService>();
        services.AddScoped<IProjectService, ProjectService>();
        services.AddScoped<IRequestService, RequestService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<IMessagingService, MessagingService>();
        services.AddScoped<IFavoriteService, FavoriteService>();
        services.AddScoped<IBuyerRequestService, BuyerRequestService>();
        services.AddScoped<ISpecialRequestService,     SpecialRequestService>();
        services.AddScoped<ISpecialRequestTypeService, SpecialRequestTypeService>();
        services.AddScoped<IAdminService, AdminService>();
        services.AddScoped<IAgentManagementService, AgentManagementService>();
        services.AddScoped<IPlanEntitlementService, PlanEntitlementService>();
        services.AddScoped<ICurrentUserCapabilities, CurrentUserCapabilitiesService>();
        services.AddScoped<IAdminPlanService, AdminPlanService>();
        services.AddScoped<IAdminPlanPricingService, AdminPlanPricingService>();
        services.AddScoped<IAdminCatalogService, AdminCatalogService>();
        services.AddScoped<IPublicPricingService, PublicPricingService>();
        services.AddScoped<IAccountResolver, AccountResolver>();
        services.AddScoped<ISubscriptionService, SubscriptionService>();
        services.AddScoped<ISubscriptionPaymentService, SubscriptionPaymentService>();
        services.AddScoped<IBlogSlugService, BlogSlugService>();
        services.AddScoped<IBlogService, BlogService>();
        services.AddScoped<ILocationMasterService, LocationMasterService>();
        services.AddScoped<IUserNotificationService, NotificationService>();
        services.AddScoped<Boioot.Application.Features.Email.IEmailService,
                           Boioot.Infrastructure.Features.Email.LoggingEmailService>();
        services.AddScoped<ISiteContentService, SiteContentService>();
        services.AddScoped<IVerificationRequestService, VerificationRequestService>();

        // ── Monetization Phase 1 ─────────────────────────────────────────────
        services.AddScoped<Boioot.Application.Features.LeadUnlocks.ILeadUnlockService,
                           Boioot.Infrastructure.Features.LeadUnlocks.LeadUnlockService>();

        // ── Billing providers ──────────────────────────────────────────────────
        // Both registered as IBillingProvider — BillingService injects IEnumerable<IBillingProvider>
        // and selects the correct one based on the plan's BillingMode field.
        services.AddScoped<IBillingProvider, InternalBillingProvider>();
        services.AddScoped<IBillingProvider, StripeBillingProvider>();

        // ── Billing orchestrator & notifications ───────────────────────────────
        services.AddScoped<IBillingService, BillingService>();
        services.AddScoped<INotificationService, LoggingNotificationService>();

        services.AddScoped<DataSeeder>();
        services.AddScoped<PlanCatalogSeeder>();
        services.AddScoped<SiteContentSeeder>();
        services.AddScoped<DatabaseStartupService>();
        services.AddScoped<SchemaEvolutionService>();
        services.AddScoped<RbacRepository>();

        return services;
    }

    // ── PostgreSQL connection string resolver ─────────────────────────────────
    // Priority:
    //   1. ConnectionStrings:Postgres in appsettings.json / environment override
    //   2. DATABASE_URL environment variable (Replit / Heroku / Railway format)
    //      Converts  postgresql://user:pass@host:port/db
    //      to        Host=host;Port=port;Database=db;Username=user;Password=pass;SSL Mode=Disable
    //   3. Individual PG* env vars (PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD)
    //      Replit always sets these alongside DATABASE_URL — useful as a final fallback.
    private static string ResolvePostgresConnectionString(IConfiguration configuration)
    {
        var explicit_ = configuration.GetConnectionString("Postgres");
        if (!string.IsNullOrWhiteSpace(explicit_))
            return explicit_;

        var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
        if (!string.IsNullOrWhiteSpace(databaseUrl))
        {
            try
            {
                var uri    = new Uri(databaseUrl);
                var host   = uri.Host;
                var port   = uri.Port > 0 ? uri.Port : 5432;
                var db     = uri.AbsolutePath.TrimStart('/');
                if (db.Contains('?')) db = db[..db.IndexOf('?')];

                var userInfo = uri.UserInfo.Split(':', 2);
                var user     = Uri.UnescapeDataString(userInfo[0]);
                var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : string.Empty;

                return $"Host={host};Port={port};Database={db};Username={user};Password={password};SSL Mode=Disable";
            }
            catch
            {
                // Fall through to PG* vars below
            }
        }

        // Fallback: individual PG* env vars (Replit sets these automatically)
        var pgHost     = Environment.GetEnvironmentVariable("PGHOST");
        var pgPort     = Environment.GetEnvironmentVariable("PGPORT") ?? "5432";
        var pgDatabase = Environment.GetEnvironmentVariable("PGDATABASE");
        var pgUser     = Environment.GetEnvironmentVariable("PGUSER");
        var pgPassword = Environment.GetEnvironmentVariable("PGPASSWORD") ?? string.Empty;

        if (!string.IsNullOrWhiteSpace(pgHost) && !string.IsNullOrWhiteSpace(pgDatabase))
            return $"Host={pgHost};Port={pgPort};Database={pgDatabase};Username={pgUser};Password={pgPassword};SSL Mode=Disable";

        // ── DIAGNOSTIC FALLBACK ────────────────────────────────────────────────
        // No connection string found from any source.
        // Return a clearly-invalid placeholder so the app can START and serve
        // /health without crashing. DB operations will fail with a clear message.
        // To fix: set DATABASE_URL or PGHOST+PGDATABASE on Fly.io via:
        //   fly secrets set DATABASE_URL="postgresql://..."
        Console.WriteLine("[STARTUP][ERROR] No PostgreSQL connection string found!");
        Console.WriteLine("[STARTUP][ERROR]   Sources checked: ConnectionStrings:Postgres, DATABASE_URL, PGHOST+PGDATABASE");
        Console.WriteLine("[STARTUP][ERROR]   App will start but ALL database operations will fail.");
        Console.WriteLine("[STARTUP][ERROR]   Fix: run `fly secrets set DATABASE_URL=postgresql://user:pass@host/db`");
        return "Host=MISSING;Database=MISSING;Username=MISSING;Password=MISSING";
    }
}
