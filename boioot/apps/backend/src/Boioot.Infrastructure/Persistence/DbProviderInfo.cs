namespace Boioot.Infrastructure.Persistence;

/// <summary>
/// Singleton that carries the configured database provider name.
/// Injected at startup so services can gate provider-specific SQL.
/// </summary>
public sealed class DbProviderInfo
{
    public string Provider { get; }

    public DbProviderInfo(string provider) =>
        Provider = provider;

    /// <summary>True when the app is backed by SQLite.</summary>
    public bool IsSqlite =>
        Provider.Equals("SQLite", StringComparison.OrdinalIgnoreCase);
}
