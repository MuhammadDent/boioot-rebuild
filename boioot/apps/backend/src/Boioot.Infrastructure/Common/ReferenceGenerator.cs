using Microsoft.EntityFrameworkCore;

namespace Boioot.Infrastructure.Common;

/// <summary>
/// Generates sequential, human-readable reference numbers of the form
/// <c>{PREFIX}-{YEAR}-{NNNNNN}</c> (e.g. <c>USR-2026-000008</c>).
///
/// Numbers are allocated from a dedicated PostgreSQL sequence per
/// (prefix, year), read atomically via <c>nextval()</c>. This is immune to the
/// gaps left by soft-deletes and to concurrent inserts — unlike a
/// <c>COUNT()</c>- or <c>MAX()</c>-based scheme, which collides with the unique
/// index after deletions or under concurrency (PostgreSQL error 23505).
///
/// Each sequence is created lazily and seeded from the current maximum existing
/// suffix + 1, so it never collides with data that predates the sequence. The
/// one-time <c>MAX</c> is used only to seed the sequence, never to allocate the
/// running numbers.
/// </summary>
public static class ReferenceGenerator
{
    public static async Task<string> NextAsync(
        DbContext context,
        IQueryable<string?> referenceNumbers,
        string prefix,
        CancellationToken ct = default)
    {
        var year         = DateTime.UtcNow.Year;
        var yearPrefix   = $"{prefix}-{year}-";
        var sequenceName = SequenceName(prefix, year);

        await EnsureSequenceAsync(context, referenceNumbers, sequenceName, yearPrefix, ct);

        // Atomic, gap- and race-safe allocation.
        var next = await context.Database
            .SqlQueryRaw<long>($"SELECT nextval('\"{sequenceName}\"') AS \"Value\"")
            .FirstAsync(ct);

        return $"{yearPrefix}{next:D6}";
    }

    /// <summary>Sequence identifier for a (prefix, year), e.g. <c>ref_usr_2026</c>.</summary>
    internal static string SequenceName(string prefix, int year)
        => $"ref_{prefix.ToLowerInvariant()}_{year}";

    /// <summary>
    /// Ensures the per-(prefix, year) sequence exists, seeding it from the
    /// current maximum existing suffix + 1 on first creation. Idempotent and
    /// race-safe: a concurrent creator seeds from the same maximum, so the
    /// resulting START value is identical.
    /// </summary>
    private static async Task EnsureSequenceAsync(
        DbContext context,
        IQueryable<string?> referenceNumbers,
        string sequenceName,
        string yearPrefix,
        CancellationToken ct)
    {
        // to_regclass returns NULL when the sequence does not exist.
        var existing = await context.Database
            .SqlQueryRaw<string?>($"SELECT to_regclass('\"{sequenceName}\"')::text AS \"Value\"")
            .FirstOrDefaultAsync(ct);

        if (!string.IsNullOrEmpty(existing))
            return; // Already created (by the startup migration or a prior call).

        // Seed from the highest existing suffix. Order by suffix length first,
        // then lexically, so the numeric maximum is selected even if a suffix
        // has grown past the zero-padded width (e.g. "1000000" > "999999").
        // This MAX is used ONCE to seed the sequence, never to allocate numbers,
        // so no COUNT() is involved in generation.
        var highest = await referenceNumbers
            .Where(r => r != null && r.StartsWith(yearPrefix))
            .OrderByDescending(r => r!.Length)
            .ThenByDescending(r => r)
            .FirstOrDefaultAsync(ct);

        long start = 1;
        if (!string.IsNullOrEmpty(highest)
            && highest!.Length > yearPrefix.Length
            && long.TryParse(highest.AsSpan(yearPrefix.Length), out var suffix))
        {
            start = suffix + 1;
        }

        await context.Database.ExecuteSqlRawAsync(
            $"CREATE SEQUENCE IF NOT EXISTS \"{sequenceName}\" START WITH {start} MINVALUE 1", ct);
    }
}
