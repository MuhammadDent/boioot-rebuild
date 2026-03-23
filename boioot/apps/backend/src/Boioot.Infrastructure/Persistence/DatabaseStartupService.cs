using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Boioot.Infrastructure.Persistence;

/// <summary>
/// Handles database initialization at startup using EF Core Migrations.
/// Replaces the old EnsureCreated() approach.
///
/// Strategy:
///   Fresh DB  → MigrateAsync() creates the full schema from migration files.
///   Existing DB (no migrations history) → inject the InitialSchema record so
///   Migrate() skips the initial migration (tables already exist) and only applies
///   any migrations that came after it.
/// </summary>
public sealed class DatabaseStartupService
{
    private const string InitialMigrationId = "20260323121520_InitialSchema";
    private const string EfProductVersion   = "8.0.10";

    private readonly BoiootDbContext      _db;
    private readonly ILogger<DatabaseStartupService> _log;

    public DatabaseStartupService(BoiootDbContext db, ILogger<DatabaseStartupService> log)
    {
        _db  = db;
        _log = log;
    }

    public async Task InitializeAsync(CancellationToken ct = default)
    {
        bool hasHistoryTable = await MigrationsHistoryExistsAsync(ct);

        if (!hasHistoryTable)
        {
            bool isExistingDatabase = await UsersTableExistsAsync(ct);

            if (isExistingDatabase)
            {
                _log.LogInformation(
                    "Existing database detected (no migration history). " +
                    "Injecting InitialSchema record so Migrate() skips table creation.");

                await CreateMigrationsHistoryTableAsync(ct);
                await InjectInitialMigrationRecordAsync(ct);
            }
            else
            {
                _log.LogInformation("Fresh database — EF Core Migrations will create the full schema.");
            }
        }

        _log.LogInformation("Running EF Core MigrateAsync...");
        await _db.Database.MigrateAsync(ct);
        _log.LogInformation("Database migration complete.");
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private bool IsSqlite =>
        _db.Database.ProviderName?.Contains("Sqlite", StringComparison.OrdinalIgnoreCase) ?? false;

    private async Task<bool> MigrationsHistoryExistsAsync(CancellationToken ct)
    {
        try
        {
            string sql = IsSqlite
                ? "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='__EFMigrationsHistory'"
                : "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = '__EFMigrationsHistory'";

            await using var cmd = _db.Database.GetDbConnection().CreateCommand();
            await _db.Database.OpenConnectionAsync(ct);
            cmd.CommandText = sql;
            var result = await cmd.ExecuteScalarAsync(ct);
            return Convert.ToInt64(result) > 0;
        }
        catch
        {
            return false;
        }
        finally
        {
            await _db.Database.CloseConnectionAsync();
        }
    }

    private async Task<bool> UsersTableExistsAsync(CancellationToken ct)
    {
        try
        {
            string sql = IsSqlite
                ? "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='Users'"
                : "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Users'";

            await using var cmd = _db.Database.GetDbConnection().CreateCommand();
            await _db.Database.OpenConnectionAsync(ct);
            cmd.CommandText = sql;
            var result = await cmd.ExecuteScalarAsync(ct);
            return Convert.ToInt64(result) > 0;
        }
        catch
        {
            return false;
        }
        finally
        {
            await _db.Database.CloseConnectionAsync();
        }
    }

    private async Task CreateMigrationsHistoryTableAsync(CancellationToken ct)
    {
        try
        {
            // SQLite:     CREATE TABLE IF NOT EXISTS ... (TEXT types, no length)
            // SQL Server: IF OBJECT_ID(...) IS NULL CREATE TABLE ... (NVARCHAR with lengths)
            string sql = IsSqlite
                ? """
                  CREATE TABLE IF NOT EXISTS __EFMigrationsHistory (
                      MigrationId    TEXT NOT NULL,
                      ProductVersion TEXT NOT NULL,
                      PRIMARY KEY (MigrationId)
                  )
                  """
                : """
                  IF OBJECT_ID('__EFMigrationsHistory', 'U') IS NULL
                  CREATE TABLE __EFMigrationsHistory (
                      MigrationId    NVARCHAR(150) NOT NULL,
                      ProductVersion NVARCHAR(32)  NOT NULL,
                      CONSTRAINT PK___EFMigrationsHistory PRIMARY KEY (MigrationId)
                  )
                  """;

            await _db.Database.ExecuteSqlRawAsync(sql, ct);
            _log.LogInformation("Created __EFMigrationsHistory table.");
        }
        catch (Exception ex)
        {
            _log.LogWarning("Could not create __EFMigrationsHistory: {msg}", ex.Message);
        }
    }

    private async Task InjectInitialMigrationRecordAsync(CancellationToken ct)
    {
        try
        {
            // SQLite:     INSERT OR IGNORE (conflict-safe upsert)
            // SQL Server: IF NOT EXISTS ... INSERT (same idempotency, ANSI SQL)
            string sql = IsSqlite
                ? $"""
                   INSERT OR IGNORE INTO __EFMigrationsHistory (MigrationId, ProductVersion)
                   VALUES ('{InitialMigrationId}', '{EfProductVersion}')
                   """
                : $"""
                   IF NOT EXISTS (
                       SELECT 1 FROM __EFMigrationsHistory
                       WHERE MigrationId = '{InitialMigrationId}'
                   )
                   INSERT INTO __EFMigrationsHistory (MigrationId, ProductVersion)
                   VALUES ('{InitialMigrationId}', '{EfProductVersion}')
                   """;

            await _db.Database.ExecuteSqlRawAsync(sql, ct);
            _log.LogInformation("Injected InitialSchema into __EFMigrationsHistory.");
        }
        catch (Exception ex)
        {
            _log.LogWarning("Could not inject migration record: {msg}", ex.Message);
        }
    }
}
