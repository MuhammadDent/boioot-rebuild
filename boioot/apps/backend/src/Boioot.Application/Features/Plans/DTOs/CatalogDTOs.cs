namespace Boioot.Application.Features.Plans.DTOs;

// ── Feature Definition DTOs ─────────────────────────────────────────────────

public class FeatureDefinitionResponse
{
    public Guid    Id           { get; set; }
    public string  Key          { get; set; } = string.Empty;
    public string  Name         { get; set; } = string.Empty;
    public string? Description  { get; set; }
    public string? FeatureGroup { get; set; }
    public bool    IsActive     { get; set; }
}

public class CreateFeatureDefinitionRequest
{
    public string  Key          { get; set; } = string.Empty;
    public string  Name         { get; set; } = string.Empty;
    public string? Description  { get; set; }
    public string? FeatureGroup { get; set; }
}

public class UpdateFeatureDefinitionRequest
{
    public string  Name         { get; set; } = string.Empty;
    public string? Description  { get; set; }
    public string? FeatureGroup { get; set; }
    public bool    IsActive     { get; set; } = true;
}

// ── Limit Definition DTOs ────────────────────────────────────────────────────

public class LimitDefinitionResponse
{
    public Guid    Id             { get; set; }
    public string  Key            { get; set; } = string.Empty;
    public string  Name           { get; set; } = string.Empty;
    public string? Description    { get; set; }
    public string? Unit           { get; set; }
    public string  ValueType      { get; set; } = "integer";
    public string? AppliesToScope { get; set; }
    public bool    IsActive       { get; set; }
}

public class CreateLimitDefinitionRequest
{
    public string  Key            { get; set; } = string.Empty;
    public string  Name           { get; set; } = string.Empty;
    public string? Description    { get; set; }
    public string? Unit           { get; set; }
    public string  ValueType      { get; set; } = "integer";
    public string? AppliesToScope { get; set; }
}

public class UpdateLimitDefinitionRequest
{
    public string  Name           { get; set; } = string.Empty;
    public string? Description    { get; set; }
    public string? Unit           { get; set; }
    public string  ValueType      { get; set; } = "integer";
    public string? AppliesToScope { get; set; }
    public bool    IsActive       { get; set; } = true;
}
