namespace Boioot.Application.Features.Billing.Settings;

/// <summary>
/// Bank details returned inside every invoice response so the frontend
/// can display payment instructions immediately after checkout.
/// Bound from appsettings.json → "BankInstructions".
/// </summary>
public sealed class BankInstructionsOptions
{
    public const string SectionName = "BankInstructions";

    public string BankName      { get; set; } = string.Empty;
    public string AccountName   { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string Instructions  { get; set; } = string.Empty;
}
