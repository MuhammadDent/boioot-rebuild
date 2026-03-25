namespace Boioot.Application.Features.Plans.DTOs;

// ── Plan Matrix DTOs ─────────────────────────────────────────────────────────

/// <summary>Full cross-plan × cross-feature matrix returned in a single request for the admin matrix editor.</summary>
public class PlanMatrixResponse
{
    public List<MatrixFeatureDef> FeatureDefs { get; set; } = new();
    public List<MatrixLimitDef>   LimitDefs   { get; set; } = new();
    public List<MatrixPlanCol>    Plans        { get; set; } = new();
}

public class MatrixFeatureDef
{
    public string  Key          { get; set; } = string.Empty;
    public string  Name         { get; set; } = string.Empty;
    public string? FeatureGroup { get; set; }
    public string? Icon         { get; set; }
    public int     SortOrder    { get; set; }
    public bool    IsSystem     { get; set; }
}

public class MatrixLimitDef
{
    public string  Key           { get; set; } = string.Empty;
    public string  Name          { get; set; } = string.Empty;
    public string? Unit          { get; set; }
    public string  ValueType     { get; set; } = "integer";
    public string? AppliesToScope { get; set; }
}

public class MatrixPlanCol
{
    public Guid    PlanId        { get; set; }
    public string  PlanName      { get; set; } = string.Empty;
    public string? Code          { get; set; }
    public bool    IsActive      { get; set; }
    public bool    IsRecommended { get; set; }
    public int     DisplayOrder  { get; set; }
    public string? PlanCategory  { get; set; }
    public decimal PriceMonthly  { get; set; }
    /// <summary>featureKey → isEnabled</summary>
    public Dictionary<string, bool> FeatureValues { get; set; } = new();
    /// <summary>limitKey → value (-1 = unlimited)</summary>
    public Dictionary<string, int>  LimitValues   { get; set; } = new();
}

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
