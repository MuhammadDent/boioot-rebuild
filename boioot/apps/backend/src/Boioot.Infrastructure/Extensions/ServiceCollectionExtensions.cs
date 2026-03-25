using Boioot.Application.Common.Services;
using Boioot.Application.Features.Billing.Interfaces;
using Boioot.Application.Features.Billing.Settings;
using Boioot.Application.Features.Admin.Interfaces;
using Boioot.Application.Features.AgentManagement.Interfaces;
using Boioot.Application.Features.Auth.Interfaces;
using Boioot.Application.Features.Blog.Interfaces;
using Boioot.Application.Features.Content.Interfaces;
using Boioot.Application.Features.Locations.Interfaces;
using Boioot.Application.Features.Onboarding.Interfaces;
using Boioot.Application.Features.BuyerRequests.Interfaces;
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
        //     "Database": { "Provider": "SQLite" }        ← default
        //     "Database": { "Provider": "SqlServer" }     ← SQL Server
        //
        //   Connection strings (appsettings.json → ConnectionStrings):
        //     "DefaultConnection"    — used when Provider = SQLite
        //     "SqlServerConnection"  — used when Provider = SqlServer
        //                             (falls back to DefaultConnection if not set)
        var dbProvider = configuration["Database:Provider"] ?? "SQLite";

        var connStr = dbProvider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase)
            ? (configuration.GetConnectionString("SqlServerConnection")
               ?? configuration.GetConnectionString("DefaultConnection"))
            : configuration.GetConnectionString("DefaultConnection");

        services.AddDbContext<BoiootDbContext>(options =>
        {
            if (dbProvider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
                options.UseSqlServer(connStr);
            else
                options.UseSqlite(connStr);
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
        services.AddScoped<ISiteContentService, SiteContentService>();

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
}
