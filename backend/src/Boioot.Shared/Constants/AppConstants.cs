namespace Boioot.Shared.Constants;

public static class AppConstants
{
    public const string AppName = "Boioot";
    public const string DefaultLanguage = "ar";
    public const int DefaultPageSize = 20;
    public const int MaxPageSize = 100;
    public const int MaxImagesPerProperty = 20;
    public const int MaxImagesPerProject = 30;

    public static class Roles
    {
        public const string Admin = "Admin";
        public const string User = "User";
        public const string PropertyOwner = "PropertyOwner";
        public const string CompanyOwner = "CompanyOwner";
        public const string Agent = "Agent";
    }

    public static class CacheKeys
    {
        public const string FeaturedProperties = "featured_properties";
        public const string FeaturedProjects = "featured_projects";
        public const string PropertyTypes = "property_types";
    }

    public static class Currencies
    {
        public const string SAR = "SAR";
        public const string USD = "USD";
        public const string SYP = "SYP";
    }
}
