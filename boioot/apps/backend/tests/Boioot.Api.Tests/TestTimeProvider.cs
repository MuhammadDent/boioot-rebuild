namespace Boioot.Api.Tests;

/// <summary>
/// A controllable <see cref="TimeProvider"/> so lockout expiry can be tested
/// deterministically without real waiting.
/// </summary>
internal sealed class TestTimeProvider : TimeProvider
{
    private DateTimeOffset _now;

    public TestTimeProvider(DateTimeOffset start) => _now = start;

    public override DateTimeOffset GetUtcNow() => _now;

    public void Advance(TimeSpan delta) => _now = _now.Add(delta);
}
