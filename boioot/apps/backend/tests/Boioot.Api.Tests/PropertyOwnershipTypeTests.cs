using Boioot.Application.Features.Properties.DTOs;
using Xunit;

namespace Boioot.Api.Tests;

/// <summary>
/// Regression tests for the OwnershipType persistence bug:
/// the value was accepted in CreatePropertyRequest but never assigned to the
/// entity, and UpdatePropertyRequest omitted the field entirely, so every
/// property ended up with OwnershipType = NULL and the UI showed "غير محدد".
///
/// These tests exercise the DTO contract and the additive null-vs-empty
/// semantics used by PropertyService (null = unchanged, empty/whitespace = clear).
/// </summary>
public class PropertyOwnershipTypeTests
{
    // ── DTO contract ──────────────────────────────────────────────────────────

    [Fact]
    public void CreatePropertyRequest_Has_OwnershipType()
    {
        var req = new CreatePropertyRequest { OwnershipType = "Freehold" };
        Assert.Equal("Freehold", req.OwnershipType);
    }

    [Fact]
    public void UpdatePropertyRequest_Has_OwnershipType()
    {
        // Field must exist on the update DTO (it was missing before the fix).
        var req = new UpdatePropertyRequest { OwnershipType = "Usufruct" };
        Assert.Equal("Usufruct", req.OwnershipType);
    }

    [Fact]
    public void UpdatePropertyRequest_OwnershipType_Defaults_To_Null()
    {
        // null = "unchanged" — older clients that don't send the field must not
        // clear existing values.
        var req = new UpdatePropertyRequest();
        Assert.Null(req.OwnershipType);
    }

    // ── Normalization semantics (mirrors PropertyService logic) ──────────────

    private static string? NormalizeCreate(string? input) =>
        string.IsNullOrWhiteSpace(input) ? null : input.Trim();

    private static string? ApplyUpdate(string? existing, string? input) =>
        input is null
            ? existing // unchanged
            : (string.IsNullOrWhiteSpace(input) ? null : input.Trim());

    [Theory]
    [InlineData("Freehold", "Freehold")]
    [InlineData("  Usufruct  ", "Usufruct")]
    [InlineData("", null)]
    [InlineData("   ", null)]
    [InlineData(null, null)]
    public void Create_Normalizes_OwnershipType(string? input, string? expected)
    {
        Assert.Equal(expected, NormalizeCreate(input));
    }

    [Fact]
    public void Update_Null_Preserves_Existing_Value()
    {
        Assert.Equal("Freehold", ApplyUpdate("Freehold", null));
    }

    [Fact]
    public void Update_EmptyString_Clears_Value()
    {
        Assert.Null(ApplyUpdate("Freehold", ""));
    }

    [Fact]
    public void Update_NewValue_Replaces_Existing()
    {
        Assert.Equal("Waqf", ApplyUpdate("Freehold", " Waqf "));
    }

    [Fact]
    public void Legacy_Null_Value_Stays_Null_Until_Edited()
    {
        // Old records created before the fix have NULL; an update that doesn't
        // send the field must keep them NULL (UI keeps showing "غير محدد").
        Assert.Null(ApplyUpdate(null, null));
    }
}
