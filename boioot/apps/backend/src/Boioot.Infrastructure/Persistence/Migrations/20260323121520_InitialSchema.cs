using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Boioot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BlogCategories",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    Name = table.Column<string>(maxLength: 200, nullable: false),
                    Slug = table.Column<string>(maxLength: 200, nullable: false),
                    Description = table.Column<string>(maxLength: 1000, nullable: true),
                    IsActive = table.Column<bool>(nullable: false),
                    SortOrder = table.Column<int>(nullable: false),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    UpdatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BlogCategories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BlogSeoSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    SiteName = table.Column<string>(maxLength: 200, nullable: false),
                    DefaultPostSeoTitleTemplate = table.Column<string>(maxLength: 500, nullable: false),
                    DefaultPostSeoDescriptionTemplate = table.Column<string>(maxLength: 1000, nullable: false),
                    DefaultBlogListSeoTitle = table.Column<string>(maxLength: 300, nullable: false),
                    DefaultBlogListSeoDescription = table.Column<string>(maxLength: 1000, nullable: false),
                    DefaultOgTitleTemplate = table.Column<string>(nullable: false),
                    DefaultOgDescriptionTemplate = table.Column<string>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BlogSeoSettings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Companies",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    Name = table.Column<string>(maxLength: 200, nullable: false),
                    LogoUrl = table.Column<string>(maxLength: 500, nullable: true),
                    Description = table.Column<string>(maxLength: 2000, nullable: true),
                    Phone = table.Column<string>(maxLength: 30, nullable: true),
                    Email = table.Column<string>(maxLength: 200, nullable: true),
                    Address = table.Column<string>(maxLength: 300, nullable: true),
                    Province = table.Column<string>(nullable: true),
                    City = table.Column<string>(maxLength: 100, nullable: true),
                    Neighborhood = table.Column<string>(maxLength: 150, nullable: true),
                    WhatsApp = table.Column<string>(maxLength: 30, nullable: true),
                    Latitude = table.Column<double>(nullable: true),
                    Longitude = table.Column<double>(nullable: true),
                    CompanyType = table.Column<string>(nullable: false),
                    IsProfileComplete = table.Column<bool>(nullable: false),
                    IsVerified = table.Column<bool>(nullable: false),
                    IsDeleted = table.Column<bool>(nullable: false),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    UpdatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Companies", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "FeatureDefinitions",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    Key = table.Column<string>(maxLength: 100, nullable: false),
                    Name = table.Column<string>(maxLength: 200, nullable: false),
                    Description = table.Column<string>(maxLength: 500, nullable: true),
                    FeatureGroup = table.Column<string>(maxLength: 100, nullable: true),
                    Icon = table.Column<string>(nullable: true),
                    IsActive = table.Column<bool>(nullable: false),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    UpdatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FeatureDefinitions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "LimitDefinitions",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    Key = table.Column<string>(maxLength: 100, nullable: false),
                    Name = table.Column<string>(maxLength: 200, nullable: false),
                    Description = table.Column<string>(maxLength: 500, nullable: true),
                    Unit = table.Column<string>(maxLength: 50, nullable: true),
                    ValueType = table.Column<string>(maxLength: 50, nullable: false, defaultValue: "integer"),
                    AppliesToScope = table.Column<string>(maxLength: 100, nullable: true),
                    IsActive = table.Column<bool>(nullable: false),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    UpdatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LimitDefinitions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "LocationCities",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    Name = table.Column<string>(maxLength: 200, nullable: false),
                    NormalizedName = table.Column<string>(maxLength: 200, nullable: false, defaultValue: ""),
                    Province = table.Column<string>(maxLength: 200, nullable: false, defaultValue: ""),
                    IsActive = table.Column<bool>(nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    UpdatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LocationCities", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "LocationNeighborhoods",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    Name = table.Column<string>(maxLength: 200, nullable: false),
                    NormalizedName = table.Column<string>(maxLength: 200, nullable: false, defaultValue: ""),
                    City = table.Column<string>(maxLength: 200, nullable: false),
                    IsActive = table.Column<bool>(nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    UpdatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LocationNeighborhoods", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "OwnershipTypeConfigs",
                columns: table => new
                {
                    Id = table.Column<string>(nullable: false),
                    Value = table.Column<string>(nullable: false),
                    Label = table.Column<string>(nullable: false),
                    Order = table.Column<int>(nullable: false),
                    IsActive = table.Column<bool>(nullable: false),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    UpdatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OwnershipTypeConfigs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Permissions",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    Key = table.Column<string>(maxLength: 200, nullable: false),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    UpdatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Permissions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Plans",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    Name = table.Column<string>(maxLength: 100, nullable: false),
                    Code = table.Column<string>(maxLength: 100, nullable: true),
                    Description = table.Column<string>(maxLength: 500, nullable: true),
                    ApplicableAccountType = table.Column<string>(maxLength: 50, nullable: true),
                    ListingLimit = table.Column<int>(nullable: false),
                    ProjectLimit = table.Column<int>(nullable: false),
                    AgentLimit = table.Column<int>(nullable: false),
                    FeaturedSlots = table.Column<int>(nullable: false),
                    ImageLimitPerListing = table.Column<int>(nullable: false, defaultValue: 5),
                    VideoAllowed = table.Column<bool>(nullable: false, defaultValue: false),
                    AnalyticsAccess = table.Column<bool>(nullable: false, defaultValue: false),
                    PriceMonthly = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    PriceYearly = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    HasTrial = table.Column<bool>(nullable: false),
                    TrialDays = table.Column<int>(nullable: false),
                    RequiresPaymentForTrial = table.Column<bool>(nullable: false),
                    IsDefaultForNewUsers = table.Column<bool>(nullable: false),
                    AvailableForSelfSignup = table.Column<bool>(nullable: false),
                    RequiresAdminApproval = table.Column<bool>(nullable: false),
                    AllowAddOns = table.Column<bool>(nullable: false),
                    AllowUpgrade = table.Column<bool>(nullable: false),
                    AllowDowngrade = table.Column<bool>(nullable: false),
                    AutoDowngradeOnExpiry = table.Column<bool>(nullable: false),
                    Features = table.Column<string>(maxLength: 2000, nullable: true),
                    IsActive = table.Column<bool>(nullable: false),
                    Rank = table.Column<int>(nullable: false),
                    DisplayOrder = table.Column<int>(nullable: false),
                    IsPublic = table.Column<bool>(nullable: false),
                    IsRecommended = table.Column<bool>(nullable: false),
                    PlanCategory = table.Column<string>(nullable: true),
                    BillingMode = table.Column<string>(nullable: false),
                    BadgeText = table.Column<string>(nullable: true),
                    PlanColor = table.Column<string>(nullable: true),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    UpdatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Plans", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PropertyAmenities",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    Key = table.Column<string>(maxLength: 100, nullable: false),
                    Label = table.Column<string>(maxLength: 200, nullable: false),
                    GroupAr = table.Column<string>(maxLength: 100, nullable: false, defaultValue: ""),
                    Order = table.Column<int>(nullable: false, defaultValue: 0),
                    IsActive = table.Column<bool>(nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    UpdatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PropertyAmenities", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PropertyListingTypes",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    Value = table.Column<string>(maxLength: 100, nullable: false),
                    Label = table.Column<string>(maxLength: 200, nullable: false),
                    Order = table.Column<int>(nullable: false, defaultValue: 0),
                    IsActive = table.Column<bool>(nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    UpdatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PropertyListingTypes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PropertyTypeConfigs",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    Value = table.Column<string>(nullable: false),
                    Label = table.Column<string>(nullable: false),
                    Icon = table.Column<string>(nullable: false),
                    Order = table.Column<int>(nullable: false),
                    IsActive = table.Column<bool>(nullable: false),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    UpdatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PropertyTypeConfigs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Roles",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    Name = table.Column<string>(maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    UpdatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Roles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    UserCode = table.Column<string>(maxLength: 20, nullable: false),
                    FullName = table.Column<string>(maxLength: 150, nullable: false),
                    Email = table.Column<string>(maxLength: 200, nullable: false),
                    Phone = table.Column<string>(maxLength: 30, nullable: true),
                    PasswordHash = table.Column<string>(maxLength: 500, nullable: false),
                    Role = table.Column<string>(maxLength: 50, nullable: false),
                    IsActive = table.Column<bool>(nullable: false),
                    IsDeleted = table.Column<bool>(nullable: false),
                    ProfileImageUrl = table.Column<string>(nullable: true),
                    TrialListingsUsed = table.Column<int>(nullable: false),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    UpdatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Projects",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    Title = table.Column<string>(maxLength: 300, nullable: false),
                    Description = table.Column<string>(maxLength: 3000, nullable: true),
                    Status = table.Column<string>(maxLength: 50, nullable: false),
                    City = table.Column<string>(maxLength: 100, nullable: false),
                    Province = table.Column<string>(nullable: true),
                    Address = table.Column<string>(maxLength: 300, nullable: true),
                    Latitude = table.Column<double>(nullable: true),
                    Longitude = table.Column<double>(nullable: true),
                    StartingPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    DeliveryDate = table.Column<DateTime>(nullable: true),
                    IsPublished = table.Column<bool>(nullable: false, defaultValue: false),
                    IsDeleted = table.Column<bool>(nullable: false),
                    CompanyId = table.Column<Guid>(nullable: false),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    UpdatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Projects", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Projects_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PlanFeatures",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    SubscriptionPlanId = table.Column<Guid>(nullable: false),
                    FeatureDefinitionId = table.Column<Guid>(nullable: false),
                    IsEnabled = table.Column<bool>(nullable: false),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    UpdatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlanFeatures", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PlanFeatures_FeatureDefinitions_FeatureDefinitionId",
                        column: x => x.FeatureDefinitionId,
                        principalTable: "FeatureDefinitions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PlanFeatures_Plans_SubscriptionPlanId",
                        column: x => x.SubscriptionPlanId,
                        principalTable: "Plans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PlanLimits",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    SubscriptionPlanId = table.Column<Guid>(nullable: false),
                    LimitDefinitionId = table.Column<Guid>(nullable: false),
                    Value = table.Column<decimal>(type: "decimal(18,4)", nullable: false),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    UpdatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlanLimits", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PlanLimits_LimitDefinitions_LimitDefinitionId",
                        column: x => x.LimitDefinitionId,
                        principalTable: "LimitDefinitions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PlanLimits_Plans_SubscriptionPlanId",
                        column: x => x.SubscriptionPlanId,
                        principalTable: "Plans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PlanPricings",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    PlanId = table.Column<Guid>(nullable: false),
                    BillingCycle = table.Column<string>(nullable: false),
                    PriceAmount = table.Column<decimal>(precision: 18, scale: 4, nullable: false),
                    CurrencyCode = table.Column<string>(nullable: false),
                    IsActive = table.Column<bool>(nullable: false),
                    IsPublic = table.Column<bool>(nullable: false),
                    ExternalProvider = table.Column<string>(nullable: true),
                    ExternalPriceId = table.Column<string>(nullable: true),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    UpdatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlanPricings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PlanPricings_Plans_PlanId",
                        column: x => x.PlanId,
                        principalTable: "Plans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RolePermissions",
                columns: table => new
                {
                    RoleId = table.Column<Guid>(nullable: false),
                    PermissionId = table.Column<Guid>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RolePermissions", x => new { x.RoleId, x.PermissionId });
                    table.ForeignKey(
                        name: "FK_RolePermissions_Permissions_PermissionId",
                        column: x => x.PermissionId,
                        principalTable: "Permissions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RolePermissions_Roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "Roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Accounts",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    Name = table.Column<string>(maxLength: 200, nullable: false),
                    AccountType = table.Column<string>(maxLength: 50, nullable: false),
                    CreatedByUserId = table.Column<Guid>(nullable: false),
                    PrimaryAdminUserId = table.Column<Guid>(nullable: true),
                    PlanId = table.Column<Guid>(nullable: true),
                    IsActive = table.Column<bool>(nullable: false),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    UpdatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Accounts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Accounts_Plans_PlanId",
                        column: x => x.PlanId,
                        principalTable: "Plans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Accounts_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Accounts_Users_PrimaryAdminUserId",
                        column: x => x.PrimaryAdminUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "Agents",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    UserId = table.Column<Guid>(nullable: false),
                    CompanyId = table.Column<Guid>(nullable: true),
                    BrokerId = table.Column<Guid>(nullable: true),
                    Bio = table.Column<string>(maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    UpdatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Agents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Agents_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Agents_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "BlogPosts",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    Title = table.Column<string>(maxLength: 500, nullable: false),
                    Slug = table.Column<string>(maxLength: 500, nullable: false),
                    Excerpt = table.Column<string>(maxLength: 1000, nullable: true),
                    Content = table.Column<string>(nullable: false),
                    CoverImageUrl = table.Column<string>(maxLength: 2000, nullable: true),
                    CoverImageAlt = table.Column<string>(nullable: true),
                    Tags = table.Column<string>(nullable: true),
                    Status = table.Column<string>(maxLength: 50, nullable: false),
                    PublishedAt = table.Column<DateTime>(nullable: true),
                    IsFeatured = table.Column<bool>(nullable: false),
                    SeoTitle = table.Column<string>(maxLength: 500, nullable: true),
                    SeoDescription = table.Column<string>(maxLength: 1000, nullable: true),
                    SeoTitleMode = table.Column<string>(nullable: false),
                    SeoDescriptionMode = table.Column<string>(nullable: false),
                    SeoMode = table.Column<string>(nullable: false),
                    SlugMode = table.Column<string>(nullable: false),
                    OgTitle = table.Column<string>(nullable: true),
                    OgDescription = table.Column<string>(nullable: true),
                    ReadTimeMinutes = table.Column<int>(nullable: true),
                    ViewCount = table.Column<int>(nullable: false),
                    IsDeleted = table.Column<bool>(nullable: false),
                    CreatedByUserId = table.Column<Guid>(nullable: false),
                    UpdatedByUserId = table.Column<Guid>(nullable: true),
                    PublishedByUserId = table.Column<Guid>(nullable: true),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    UpdatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BlogPosts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BlogPosts_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BlogPosts_Users_PublishedByUserId",
                        column: x => x.PublishedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BlogPosts_Users_UpdatedByUserId",
                        column: x => x.UpdatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "BuyerRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    Title = table.Column<string>(nullable: false),
                    PropertyType = table.Column<string>(nullable: false),
                    Description = table.Column<string>(nullable: false),
                    City = table.Column<string>(nullable: true),
                    Neighborhood = table.Column<string>(nullable: true),
                    IsPublished = table.Column<bool>(nullable: false),
                    UserId = table.Column<Guid>(nullable: false),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    UpdatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BuyerRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BuyerRequests_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Notifications",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    UserId = table.Column<Guid>(nullable: false),
                    Type = table.Column<string>(nullable: false),
                    Title = table.Column<string>(nullable: false),
                    Body = table.Column<string>(nullable: false),
                    IsRead = table.Column<bool>(nullable: false),
                    RelatedEntityId = table.Column<string>(nullable: true),
                    RelatedEntityType = table.Column<string>(nullable: true),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    UpdatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Notifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Notifications_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Reviews",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    ReviewerId = table.Column<Guid>(nullable: false),
                    TargetType = table.Column<string>(maxLength: 50, nullable: false),
                    TargetId = table.Column<Guid>(nullable: false),
                    Rating = table.Column<int>(nullable: false),
                    Comment = table.Column<string>(maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    UpdatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Reviews", x => x.Id);
                    table.CheckConstraint("CK_Review_Rating", "\"Rating\" >= 1 AND \"Rating\" <= 5");
                    table.ForeignKey(
                        name: "FK_Reviews_Users_ReviewerId",
                        column: x => x.ReviewerId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "UserRoles",
                columns: table => new
                {
                    UserId = table.Column<Guid>(nullable: false),
                    RoleId = table.Column<Guid>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserRoles", x => new { x.UserId, x.RoleId });
                    table.ForeignKey(
                        name: "FK_UserRoles_Roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "Roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserRoles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProjectImages",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    ProjectId = table.Column<Guid>(nullable: false),
                    ImageUrl = table.Column<string>(maxLength: 500, nullable: false),
                    IsPrimary = table.Column<bool>(nullable: false),
                    Order = table.Column<int>(nullable: false),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    UpdatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectImages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProjectImages_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Invoices",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    UserId = table.Column<Guid>(nullable: false),
                    PlanPricingId = table.Column<Guid>(nullable: false),
                    Amount = table.Column<decimal>(precision: 18, scale: 4, nullable: false),
                    Currency = table.Column<string>(nullable: false),
                    Status = table.Column<int>(nullable: false),
                    ProviderName = table.Column<string>(nullable: false),
                    ExternalRef = table.Column<string>(nullable: true),
                    StripeSessionUrl = table.Column<string>(nullable: true),
                    AdminNote = table.Column<string>(nullable: true),
                    ExpiresAt = table.Column<DateTime>(nullable: true),
                    ApprovedBy = table.Column<Guid>(nullable: true),
                    ApprovedAt = table.Column<DateTime>(nullable: true),
                    RejectedBy = table.Column<Guid>(nullable: true),
                    RejectedAt = table.Column<DateTime>(nullable: true),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    UpdatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Invoices", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Invoices_PlanPricings_PlanPricingId",
                        column: x => x.PlanPricingId,
                        principalTable: "PlanPricings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Invoices_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AccountUsers",
                columns: table => new
                {
                    AccountId = table.Column<Guid>(nullable: false),
                    UserId = table.Column<Guid>(nullable: false),
                    OrganizationUserRole = table.Column<string>(maxLength: 50, nullable: false),
                    IsPrimary = table.Column<bool>(nullable: false),
                    IsActive = table.Column<bool>(nullable: false),
                    JoinedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AccountUsers", x => new { x.AccountId, x.UserId });
                    table.ForeignKey(
                        name: "FK_AccountUsers_Accounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AccountUsers_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SubscriptionPaymentRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    AccountId = table.Column<Guid>(nullable: false),
                    UserId = table.Column<Guid>(nullable: false),
                    RequestedPlanId = table.Column<Guid>(nullable: false),
                    RequestedPricingId = table.Column<Guid>(nullable: true),
                    BillingCycle = table.Column<string>(maxLength: 20, nullable: false),
                    Amount = table.Column<decimal>(precision: 18, scale: 4, nullable: false),
                    Currency = table.Column<string>(maxLength: 10, nullable: false),
                    PaymentMethod = table.Column<string>(maxLength: 50, nullable: false),
                    PaymentFlowType = table.Column<string>(maxLength: 20, nullable: false),
                    ReceiptImageUrl = table.Column<string>(maxLength: 2000, nullable: true),
                    ReceiptFileName = table.Column<string>(maxLength: 300, nullable: true),
                    CustomerNote = table.Column<string>(maxLength: 1000, nullable: true),
                    SalesRepresentativeName = table.Column<string>(maxLength: 200, nullable: true),
                    SalesRepresentativeId = table.Column<Guid>(nullable: true),
                    Status = table.Column<string>(maxLength: 50, nullable: false),
                    ReviewedByUserId = table.Column<Guid>(nullable: true),
                    ReviewNote = table.Column<string>(maxLength: 1000, nullable: true),
                    ExternalPaymentReference = table.Column<string>(maxLength: 500, nullable: true),
                    ReviewedAt = table.Column<DateTime>(nullable: true),
                    ActivatedAt = table.Column<DateTime>(nullable: true),
                    CompletedAt = table.Column<DateTime>(nullable: true),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    UpdatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SubscriptionPaymentRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SubscriptionPaymentRequests_Accounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SubscriptionPaymentRequests_Plans_RequestedPlanId",
                        column: x => x.RequestedPlanId,
                        principalTable: "Plans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Subscriptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    AccountId = table.Column<Guid>(nullable: false),
                    PlanId = table.Column<Guid>(nullable: false),
                    Status = table.Column<string>(maxLength: 50, nullable: false),
                    StartDate = table.Column<DateTime>(nullable: false),
                    EndDate = table.Column<DateTime>(nullable: true),
                    PaymentRef = table.Column<string>(maxLength: 200, nullable: true),
                    PricingId = table.Column<Guid>(nullable: true),
                    IsActive = table.Column<bool>(nullable: false),
                    AutoRenew = table.Column<bool>(nullable: false),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    UpdatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Subscriptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Subscriptions_Accounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Subscriptions_Plans_PlanId",
                        column: x => x.PlanId,
                        principalTable: "Plans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Properties",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    Title = table.Column<string>(maxLength: 300, nullable: false),
                    Description = table.Column<string>(maxLength: 3000, nullable: true),
                    Type = table.Column<string>(maxLength: 50, nullable: false),
                    ListingType = table.Column<string>(maxLength: 100, nullable: false),
                    Status = table.Column<string>(maxLength: 50, nullable: false),
                    Price = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Currency = table.Column<string>(maxLength: 10, nullable: false, defaultValue: "SYP"),
                    Area = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    Bedrooms = table.Column<int>(nullable: true),
                    Bathrooms = table.Column<int>(nullable: true),
                    HallsCount = table.Column<int>(nullable: true),
                    Province = table.Column<string>(nullable: true),
                    Neighborhood = table.Column<string>(maxLength: 150, nullable: true),
                    Address = table.Column<string>(maxLength: 300, nullable: true),
                    City = table.Column<string>(maxLength: 100, nullable: false),
                    Latitude = table.Column<double>(nullable: true),
                    Longitude = table.Column<double>(nullable: true),
                    IsDeleted = table.Column<bool>(nullable: false),
                    PaymentType = table.Column<string>(nullable: false),
                    InstallmentsCount = table.Column<int>(nullable: true),
                    HasCommission = table.Column<bool>(nullable: false),
                    CommissionType = table.Column<string>(nullable: true),
                    CommissionValue = table.Column<decimal>(precision: 18, scale: 4, nullable: true),
                    OwnershipType = table.Column<string>(nullable: true),
                    Floor = table.Column<string>(nullable: true),
                    PropertyAge = table.Column<int>(nullable: true),
                    Features = table.Column<string>(nullable: true),
                    VideoUrl = table.Column<string>(nullable: true),
                    CompanyId = table.Column<Guid>(nullable: false),
                    AgentId = table.Column<Guid>(nullable: true),
                    OwnerId = table.Column<string>(nullable: true),
                    AccountId = table.Column<Guid>(nullable: true),
                    CreatedByUserId = table.Column<string>(nullable: false),
                    CreatedByRole = table.Column<string>(nullable: false),
                    CreatedByCompanyId = table.Column<Guid>(nullable: true),
                    ViewCount = table.Column<int>(nullable: false),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    UpdatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Properties", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Properties_Agents_AgentId",
                        column: x => x.AgentId,
                        principalTable: "Agents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Properties_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "BlogPostCategories",
                columns: table => new
                {
                    BlogPostId = table.Column<Guid>(nullable: false),
                    BlogCategoryId = table.Column<Guid>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BlogPostCategories", x => new { x.BlogPostId, x.BlogCategoryId });
                    table.ForeignKey(
                        name: "FK_BlogPostCategories_BlogCategories_BlogCategoryId",
                        column: x => x.BlogCategoryId,
                        principalTable: "BlogCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BlogPostCategories_BlogPosts_BlogPostId",
                        column: x => x.BlogPostId,
                        principalTable: "BlogPosts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BuyerRequestComments",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    Content = table.Column<string>(nullable: false),
                    BuyerRequestId = table.Column<Guid>(nullable: false),
                    UserId = table.Column<Guid>(nullable: false),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    UpdatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BuyerRequestComments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BuyerRequestComments_BuyerRequests_BuyerRequestId",
                        column: x => x.BuyerRequestId,
                        principalTable: "BuyerRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BuyerRequestComments_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PaymentProofs",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    InvoiceId = table.Column<Guid>(nullable: false),
                    ImageUrl = table.Column<string>(nullable: false),
                    Notes = table.Column<string>(nullable: true),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    UpdatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentProofs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PaymentProofs_Invoices_InvoiceId",
                        column: x => x.InvoiceId,
                        principalTable: "Invoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Conversations",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    User1Id = table.Column<Guid>(nullable: false),
                    User2Id = table.Column<Guid>(nullable: false),
                    PropertyId = table.Column<Guid>(nullable: true),
                    ProjectId = table.Column<Guid>(nullable: true),
                    LastMessageAt = table.Column<DateTime>(nullable: true),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    UpdatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Conversations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Conversations_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Conversations_Properties_PropertyId",
                        column: x => x.PropertyId,
                        principalTable: "Properties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Conversations_Users_User1Id",
                        column: x => x.User1Id,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Conversations_Users_User2Id",
                        column: x => x.User2Id,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Favorites",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    UserId = table.Column<Guid>(nullable: false),
                    PropertyId = table.Column<Guid>(nullable: false),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    UpdatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Favorites", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Favorites_Properties_PropertyId",
                        column: x => x.PropertyId,
                        principalTable: "Properties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Favorites_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PropertyAmenitySelections",
                columns: table => new
                {
                    PropertyId = table.Column<Guid>(nullable: false),
                    AmenityId = table.Column<Guid>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PropertyAmenitySelections", x => new { x.PropertyId, x.AmenityId });
                    table.ForeignKey(
                        name: "FK_PropertyAmenitySelections_Properties_PropertyId",
                        column: x => x.PropertyId,
                        principalTable: "Properties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PropertyAmenitySelections_PropertyAmenities_AmenityId",
                        column: x => x.AmenityId,
                        principalTable: "PropertyAmenities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PropertyImages",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    PropertyId = table.Column<Guid>(nullable: false),
                    ImageUrl = table.Column<string>(maxLength: 500, nullable: false),
                    IsPrimary = table.Column<bool>(nullable: false),
                    Order = table.Column<int>(nullable: false),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    UpdatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PropertyImages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PropertyImages_Properties_PropertyId",
                        column: x => x.PropertyId,
                        principalTable: "Properties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Requests",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    Name = table.Column<string>(maxLength: 200, nullable: false),
                    Phone = table.Column<string>(maxLength: 50, nullable: false),
                    Email = table.Column<string>(maxLength: 200, nullable: true),
                    Message = table.Column<string>(maxLength: 2000, nullable: true),
                    Status = table.Column<string>(maxLength: 50, nullable: false),
                    PropertyId = table.Column<Guid>(nullable: true),
                    ProjectId = table.Column<Guid>(nullable: true),
                    UserId = table.Column<Guid>(nullable: true),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    UpdatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Requests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Requests_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Requests_Properties_PropertyId",
                        column: x => x.PropertyId,
                        principalTable: "Properties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Requests_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Messages",
                columns: table => new
                {
                    Id = table.Column<Guid>(nullable: false),
                    ConversationId = table.Column<Guid>(nullable: false),
                    SenderId = table.Column<Guid>(nullable: false),
                    Content = table.Column<string>(maxLength: 2000, nullable: false),
                    IsRead = table.Column<bool>(nullable: false),
                    AttachmentData = table.Column<string>(nullable: true),
                    AttachmentName = table.Column<string>(nullable: true),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    UpdatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Messages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Messages_Conversations_ConversationId",
                        column: x => x.ConversationId,
                        principalTable: "Conversations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Messages_Users_SenderId",
                        column: x => x.SenderId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Accounts_AccountType",
                table: "Accounts",
                column: "AccountType");

            migrationBuilder.CreateIndex(
                name: "IX_Accounts_CreatedByUserId",
                table: "Accounts",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Accounts_PlanId",
                table: "Accounts",
                column: "PlanId");

            migrationBuilder.CreateIndex(
                name: "IX_Accounts_PrimaryAdminUserId",
                table: "Accounts",
                column: "PrimaryAdminUserId");

            migrationBuilder.CreateIndex(
                name: "IX_AccountUsers_UserId",
                table: "AccountUsers",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Agents_CompanyId",
                table: "Agents",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_Agents_UserId",
                table: "Agents",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BlogCategories_Slug",
                table: "BlogCategories",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BlogCategories_SortOrder",
                table: "BlogCategories",
                column: "SortOrder");

            migrationBuilder.CreateIndex(
                name: "IX_BlogPostCategories_BlogCategoryId",
                table: "BlogPostCategories",
                column: "BlogCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_BlogPosts_CreatedByUserId",
                table: "BlogPosts",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_BlogPosts_IsFeatured",
                table: "BlogPosts",
                column: "IsFeatured");

            migrationBuilder.CreateIndex(
                name: "IX_BlogPosts_PublishedAt",
                table: "BlogPosts",
                column: "PublishedAt");

            migrationBuilder.CreateIndex(
                name: "IX_BlogPosts_PublishedByUserId",
                table: "BlogPosts",
                column: "PublishedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_BlogPosts_Slug",
                table: "BlogPosts",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BlogPosts_Status",
                table: "BlogPosts",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_BlogPosts_UpdatedByUserId",
                table: "BlogPosts",
                column: "UpdatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_BuyerRequestComments_BuyerRequestId",
                table: "BuyerRequestComments",
                column: "BuyerRequestId");

            migrationBuilder.CreateIndex(
                name: "IX_BuyerRequestComments_UserId",
                table: "BuyerRequestComments",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_BuyerRequests_UserId",
                table: "BuyerRequests",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Conversations_LastMessageAt",
                table: "Conversations",
                column: "LastMessageAt");

            migrationBuilder.CreateIndex(
                name: "IX_Conversations_ProjectId",
                table: "Conversations",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_Conversations_PropertyId",
                table: "Conversations",
                column: "PropertyId");

            migrationBuilder.CreateIndex(
                name: "IX_Conversations_User1Id",
                table: "Conversations",
                column: "User1Id");

            migrationBuilder.CreateIndex(
                name: "IX_Conversations_User2Id",
                table: "Conversations",
                column: "User2Id");

            migrationBuilder.CreateIndex(
                name: "IX_Favorites_PropertyId",
                table: "Favorites",
                column: "PropertyId");

            migrationBuilder.CreateIndex(
                name: "IX_Favorites_UserId",
                table: "Favorites",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_FeatureDefinitions_FeatureGroup",
                table: "FeatureDefinitions",
                column: "FeatureGroup");

            migrationBuilder.CreateIndex(
                name: "IX_FeatureDefinitions_Key",
                table: "FeatureDefinitions",
                column: "Key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_PlanPricingId",
                table: "Invoices",
                column: "PlanPricingId");

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_UserId",
                table: "Invoices",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_LimitDefinitions_AppliesToScope",
                table: "LimitDefinitions",
                column: "AppliesToScope");

            migrationBuilder.CreateIndex(
                name: "IX_LimitDefinitions_Key",
                table: "LimitDefinitions",
                column: "Key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Messages_ConversationId_CreatedAt",
                table: "Messages",
                columns: new[] { "ConversationId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Messages_SenderId",
                table: "Messages",
                column: "SenderId");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_UserId",
                table: "Notifications",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentProofs_InvoiceId",
                table: "PaymentProofs",
                column: "InvoiceId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Permissions_Key",
                table: "Permissions",
                column: "Key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PlanFeatures_FeatureDefinitionId",
                table: "PlanFeatures",
                column: "FeatureDefinitionId");

            migrationBuilder.CreateIndex(
                name: "IX_PlanFeatures_SubscriptionPlanId",
                table: "PlanFeatures",
                column: "SubscriptionPlanId");

            migrationBuilder.CreateIndex(
                name: "IX_PlanFeatures_SubscriptionPlanId_FeatureDefinitionId",
                table: "PlanFeatures",
                columns: new[] { "SubscriptionPlanId", "FeatureDefinitionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PlanLimits_LimitDefinitionId",
                table: "PlanLimits",
                column: "LimitDefinitionId");

            migrationBuilder.CreateIndex(
                name: "IX_PlanLimits_SubscriptionPlanId",
                table: "PlanLimits",
                column: "SubscriptionPlanId");

            migrationBuilder.CreateIndex(
                name: "IX_PlanLimits_SubscriptionPlanId_LimitDefinitionId",
                table: "PlanLimits",
                columns: new[] { "SubscriptionPlanId", "LimitDefinitionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PlanPricings_PlanId",
                table: "PlanPricings",
                column: "PlanId");

            migrationBuilder.CreateIndex(
                name: "IX_Plans_ApplicableAccountType",
                table: "Plans",
                column: "ApplicableAccountType");

            migrationBuilder.CreateIndex(
                name: "IX_Plans_Code",
                table: "Plans",
                column: "Code",
                unique: true,
                filter: "Code IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Plans_Name",
                table: "Plans",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProjectImages_ProjectId",
                table: "ProjectImages",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_Projects_City",
                table: "Projects",
                column: "City");

            migrationBuilder.CreateIndex(
                name: "IX_Projects_CompanyId",
                table: "Projects",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_Projects_CreatedAt",
                table: "Projects",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Projects_IsPublished",
                table: "Projects",
                column: "IsPublished");

            migrationBuilder.CreateIndex(
                name: "IX_Projects_Status",
                table: "Projects",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Properties_AccountId",
                table: "Properties",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_Properties_AgentId",
                table: "Properties",
                column: "AgentId");

            migrationBuilder.CreateIndex(
                name: "IX_Properties_City",
                table: "Properties",
                column: "City");

            migrationBuilder.CreateIndex(
                name: "IX_Properties_CompanyId",
                table: "Properties",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_Properties_CreatedAt",
                table: "Properties",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Properties_Status",
                table: "Properties",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Properties_Type",
                table: "Properties",
                column: "Type");

            migrationBuilder.CreateIndex(
                name: "IX_PropertyAmenities_IsActive",
                table: "PropertyAmenities",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_PropertyAmenities_Key",
                table: "PropertyAmenities",
                column: "Key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PropertyAmenities_Order",
                table: "PropertyAmenities",
                column: "Order");

            migrationBuilder.CreateIndex(
                name: "IX_PropertyAmenitySelections_AmenityId",
                table: "PropertyAmenitySelections",
                column: "AmenityId");

            migrationBuilder.CreateIndex(
                name: "IX_PropertyAmenitySelections_PropertyId",
                table: "PropertyAmenitySelections",
                column: "PropertyId");

            migrationBuilder.CreateIndex(
                name: "IX_PropertyImages_PropertyId",
                table: "PropertyImages",
                column: "PropertyId");

            migrationBuilder.CreateIndex(
                name: "IX_PropertyListingTypes_Value",
                table: "PropertyListingTypes",
                column: "Value",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Requests_CreatedAt",
                table: "Requests",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Requests_ProjectId",
                table: "Requests",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_Requests_PropertyId",
                table: "Requests",
                column: "PropertyId");

            migrationBuilder.CreateIndex(
                name: "IX_Requests_Status",
                table: "Requests",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Requests_UserId",
                table: "Requests",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_ReviewerId",
                table: "Reviews",
                column: "ReviewerId");

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_TargetType_TargetId",
                table: "Reviews",
                columns: new[] { "TargetType", "TargetId" });

            migrationBuilder.CreateIndex(
                name: "IX_RolePermissions_PermissionId",
                table: "RolePermissions",
                column: "PermissionId");

            migrationBuilder.CreateIndex(
                name: "IX_Roles_Name",
                table: "Roles",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SubscriptionPaymentRequests_AccountId",
                table: "SubscriptionPaymentRequests",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_SubscriptionPaymentRequests_CreatedAt",
                table: "SubscriptionPaymentRequests",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_SubscriptionPaymentRequests_PaymentFlowType",
                table: "SubscriptionPaymentRequests",
                column: "PaymentFlowType");

            migrationBuilder.CreateIndex(
                name: "IX_SubscriptionPaymentRequests_PaymentMethod",
                table: "SubscriptionPaymentRequests",
                column: "PaymentMethod");

            migrationBuilder.CreateIndex(
                name: "IX_SubscriptionPaymentRequests_RequestedPlanId",
                table: "SubscriptionPaymentRequests",
                column: "RequestedPlanId");

            migrationBuilder.CreateIndex(
                name: "IX_SubscriptionPaymentRequests_Status",
                table: "SubscriptionPaymentRequests",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Subscriptions_AccountId",
                table: "Subscriptions",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_Subscriptions_EndDate",
                table: "Subscriptions",
                column: "EndDate");

            migrationBuilder.CreateIndex(
                name: "IX_Subscriptions_IsActive",
                table: "Subscriptions",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_Subscriptions_PlanId",
                table: "Subscriptions",
                column: "PlanId");

            migrationBuilder.CreateIndex(
                name: "IX_Subscriptions_Status",
                table: "Subscriptions",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_UserRoles_RoleId",
                table: "UserRoles",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_UserCode",
                table: "Users",
                column: "UserCode",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AccountUsers");

            migrationBuilder.DropTable(
                name: "BlogPostCategories");

            migrationBuilder.DropTable(
                name: "BlogSeoSettings");

            migrationBuilder.DropTable(
                name: "BuyerRequestComments");

            migrationBuilder.DropTable(
                name: "Favorites");

            migrationBuilder.DropTable(
                name: "LocationCities");

            migrationBuilder.DropTable(
                name: "LocationNeighborhoods");

            migrationBuilder.DropTable(
                name: "Messages");

            migrationBuilder.DropTable(
                name: "Notifications");

            migrationBuilder.DropTable(
                name: "OwnershipTypeConfigs");

            migrationBuilder.DropTable(
                name: "PaymentProofs");

            migrationBuilder.DropTable(
                name: "PlanFeatures");

            migrationBuilder.DropTable(
                name: "PlanLimits");

            migrationBuilder.DropTable(
                name: "ProjectImages");

            migrationBuilder.DropTable(
                name: "PropertyAmenitySelections");

            migrationBuilder.DropTable(
                name: "PropertyImages");

            migrationBuilder.DropTable(
                name: "PropertyListingTypes");

            migrationBuilder.DropTable(
                name: "PropertyTypeConfigs");

            migrationBuilder.DropTable(
                name: "Requests");

            migrationBuilder.DropTable(
                name: "Reviews");

            migrationBuilder.DropTable(
                name: "RolePermissions");

            migrationBuilder.DropTable(
                name: "SubscriptionPaymentRequests");

            migrationBuilder.DropTable(
                name: "Subscriptions");

            migrationBuilder.DropTable(
                name: "UserRoles");

            migrationBuilder.DropTable(
                name: "BlogCategories");

            migrationBuilder.DropTable(
                name: "BlogPosts");

            migrationBuilder.DropTable(
                name: "BuyerRequests");

            migrationBuilder.DropTable(
                name: "Conversations");

            migrationBuilder.DropTable(
                name: "Invoices");

            migrationBuilder.DropTable(
                name: "FeatureDefinitions");

            migrationBuilder.DropTable(
                name: "LimitDefinitions");

            migrationBuilder.DropTable(
                name: "PropertyAmenities");

            migrationBuilder.DropTable(
                name: "Permissions");

            migrationBuilder.DropTable(
                name: "Accounts");

            migrationBuilder.DropTable(
                name: "Roles");

            migrationBuilder.DropTable(
                name: "Projects");

            migrationBuilder.DropTable(
                name: "Properties");

            migrationBuilder.DropTable(
                name: "PlanPricings");

            migrationBuilder.DropTable(
                name: "Agents");

            migrationBuilder.DropTable(
                name: "Plans");

            migrationBuilder.DropTable(
                name: "Companies");

            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}
