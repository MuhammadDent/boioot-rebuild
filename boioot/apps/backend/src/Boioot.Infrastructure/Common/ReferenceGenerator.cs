using Microsoft.EntityFrameworkCore;

namespace Boioot.Infrastructure.Common;

public static class ReferenceGenerator
{
    public static async Task<string> NextAsync(
        IQueryable<string?> referenceNumbers,
        string prefix,
        CancellationToken ct = default)
    {
        var year = DateTime.UtcNow.Year;
        var yearPrefix = $"{prefix}-{year}-";
        var count = await referenceNumbers
            .CountAsync(r => r != null && r.StartsWith(yearPrefix), ct);
        return $"{yearPrefix}{count + 1:D6}";
    }
}
