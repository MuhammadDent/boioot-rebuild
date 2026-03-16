using Boioot.Application.Common.Services;
using Boioot.Application.Features.Admin.Interfaces;
using Boioot.Application.Features.Auth.Interfaces;
using Boioot.Application.Features.Projects.Interfaces;
using Boioot.Application.Features.Properties.Interfaces;
using Boioot.Application.Features.Dashboard.Interfaces;
using Boioot.Application.Features.Messaging.Interfaces;
using Boioot.Application.Features.Favorites.Interfaces;
using Boioot.Application.Features.Requests.Interfaces;
using Boioot.Infrastructure.Common;
using Boioot.Infrastructure.Features.Admin;
using Boioot.Infrastructure.Features.Auth;
using Boioot.Infrastructure.Features.Dashboard;
using Boioot.Infrastructure.Features.Messaging;
using Boioot.Infrastructure.Features.Projects;
using Boioot.Infrastructure.Features.Properties;
using Boioot.Infrastructure.Features.Favorites;
using Boioot.Infrastructure.Features.Requests;
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
        services.AddDbContext<BoiootDbContext>(options =>
            options.UseSqlite(configuration.GetConnectionString("DefaultConnection")));

        services.AddScoped<ICompanyOwnershipService, CompanyOwnershipService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IPropertyService, PropertyService>();
        services.AddScoped<IProjectService, ProjectService>();
        services.AddScoped<IRequestService, RequestService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<IMessagingService, MessagingService>();
        services.AddScoped<IFavoriteService, FavoriteService>();
        services.AddScoped<IAdminService, AdminService>();
        services.AddScoped<DataSeeder>();

        return services;
    }
}
