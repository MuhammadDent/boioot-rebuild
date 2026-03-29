using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.Logging;

namespace Boioot.Infrastructure.Persistence;

/// <summary>
/// Handles database initialization at startup.
///
/// SQLite / SQL Server path:
///   Fresh DB  → MigrateAsync() creates the full schema from migration files.
///   Existing DB (no history) → inject the InitialSchema record so Migrate()
///   skips the initial migration and only applies newer ones.
///
/// PostgreSQL path:
///   Fresh DB  → EnsureCreated() builds the schema from the current EF Core model
///               (proper PostgreSQL types: timestamp, boolean, uuid, text …), then
///               all existing migration IDs are written to __EFMigrationsHistory
///               so MigrateAsync() never tries to replay the SQLite-era migrations.
///   Existing DB (no history) → same injection of all migration IDs.
///   Existing DB (has history) → MigrateAsync() for any pending migrations only.
/// </summary>
public sealed class DatabaseStartupService
{
    private const string InitialMigrationId = "20260323121520_InitialSchema";
    private const string EfProductVersion   = "8.0.10";

    private readonly BoiootDbContext                  _db;
    private readonly ILogger<DatabaseStartupService>  _log;

    public DatabaseStartupService(BoiootDbContext db, ILogger<DatabaseStartupService> log)
    {
        _db  = db;
        _log = log;
    }

    public async Task InitializeAsync(CancellationToken ct = default)
    {
        if (IsPostgres)
        {
            await InitializePostgresAsync(ct);
            return;
        }

        // ── SQLite / SQL Server path ──────────────────────────────────────────
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

    // ── PostgreSQL-specific startup ───────────────────────────────────────────

    private async Task InitializePostgresAsync(CancellationToken ct)
    {
        bool hasHistoryTable = await MigrationsHistoryExistsAsync(ct);

        if (!hasHistoryTable)
        {
            bool isExistingDatabase = await UsersTableExistsAsync(ct);

            if (isExistingDatabase)
            {
                _log.LogInformation(
                    "Existing PostgreSQL database (no migration history). " +
                    "Creating history table and marking all migrations as applied.");
                await CreateMigrationsHistoryTableAsync(ct);
                await InjectAllMigrationIdsAsync(ct);
            }
            else
            {
                _log.LogInformation(
                    "Fresh PostgreSQL database — using EnsureCreated() for proper schema types.");
                await _db.Database.EnsureCreatedAsync(ct);
                _log.LogInformation("PostgreSQL schema created. Injecting migration history.");
                await CreateMigrationsHistoryTableAsync(ct);
                await InjectAllMigrationIdsAsync(ct);
                _log.LogInformation("PostgreSQL database ready.");
                return;
            }
        }

        // Has history → apply any pending migrations (Day 12+ migrations are
        // authored to be PostgreSQL-compatible from the start).
        _log.LogInformation("Running EF Core MigrateAsync for PostgreSQL pending migrations...");
        await _db.Database.MigrateAsync(ct);
        _log.LogInformation("PostgreSQL migration complete.");
    }

    /// <summary>
    /// Marks every migration in the assembly as applied so MigrateAsync()
    /// skips the old SQLite-era migrations on a PostgreSQL database.
    /// </summary>
    private async Task InjectAllMigrationIdsAsync(CancellationToken ct)
    {
        var allMigrations = _db.GetService<IMigrationsAssembly>().Migrations.Keys;

        foreach (var migrationId in allMigrations)
        {
            try
            {
                string sql = $"""
                    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
                    VALUES ('{migrationId}', '{EfProductVersion}')
                    ON CONFLICT ("MigrationId") DO NOTHING
                    """;
                await _db.Database.ExecuteSqlRawAsync(sql, ct);
                _log.LogInformation("Marked migration as applied: {id}", migrationId);
            }
            catch (Exception ex)
            {
                _log.LogWarning("Could not inject migration record {id}: {msg}", migrationId, ex.Message);
            }
        }
    }

    // ── Provider helpers ──────────────────────────────────────────────────────

    private bool IsSqlite =>
        _db.Database.ProviderName?.Contains("Sqlite", StringComparison.OrdinalIgnoreCase) ?? false;

    private bool IsPostgres =>
        _db.Database.ProviderName?.Contains("Npgsql", StringComparison.OrdinalIgnoreCase) ?? false;

    // ── Generic SQL helpers ───────────────────────────────────────────────────

    private async Task<bool> MigrationsHistoryExistsAsync(CancellationToken ct)
    {
        try
        {
            string sql = IsSqlite
                ? "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='__EFMigrationsHistory'"
                : IsPostgres
                    ? "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='__EFMigrationsHistory'"
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
                : IsPostgres
                    ? "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='Users'"
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
            string sql = IsSqlite
                ? """
                  CREATE TABLE IF NOT EXISTS __EFMigrationsHistory (
                      MigrationId    TEXT NOT NULL,
                      ProductVersion TEXT NOT NULL,
                      PRIMARY KEY (MigrationId)
                  )
                  """
                : IsPostgres
                    ? """
                      CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
                          "MigrationId"    VARCHAR(150) NOT NULL,
                          "ProductVersion" VARCHAR(32)  NOT NULL,
                          CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
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
            string sql = IsSqlite
                ? $"""
                   INSERT OR IGNORE INTO __EFMigrationsHistory (MigrationId, ProductVersion)
                   VALUES ('{InitialMigrationId}', '{EfProductVersion}')
                   """
                : IsPostgres
                    ? $"""
                       INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
                       VALUES ('{InitialMigrationId}', '{EfProductVersion}')
                       ON CONFLICT ("MigrationId") DO NOTHING
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
