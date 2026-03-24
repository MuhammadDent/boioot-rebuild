namespace Boioot.Application.Features.Plans.DTOs;

// ── Feature Definition DTOs ─────────────────────────────────────────────────

public class FeatureDefinitionResponse
{
    public Guid    Id               { get; set; }
    public string  Key              { get; set; } = string.Empty;
    public string  Name             { get; set; } = string.Empty;
    public string? Description      { get; set; }
    public string? FeatureGroup     { get; set; }
    public string? Icon             { get; set; }
    public bool    IsActive         { get; set; }
    public string  Type             { get; set; } = "boolean";
    public string  Scope            { get; set; } = "system";
    public bool    IsSystem         { get; set; }
    public int     SortOrder        { get; set; }
    public int     PlanFeatureCount { get; set; }
}

public class CreateFeatureDefinitionRequest
{
    public string  Key          { get; set; } = string.Empty;
    public string  Name         { get; set; } = string.Empty;
    public string? Description  { get; set; }
    public string? FeatureGroup { get; set; }
    public string? Icon         { get; set; }
    public string  Type         { get; set; } = "boolean";
    public string  Scope        { get; set; } = "system";
    public int     SortOrder    { get; set; } = 0;
}

public class UpdateFeatureDefinitionRequest
{
    public string  Name         { get; set; } = string.Empty;
    public string? Description  { get; set; }
    public string? FeatureGroup { get; set; }
    public string? Icon         { get; set; }
    public bool    IsActive     { get; set; } = true;
    public int     SortOrder    { get; set; } = 0;
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
