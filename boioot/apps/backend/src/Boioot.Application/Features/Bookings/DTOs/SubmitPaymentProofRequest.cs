namespace Boioot.Application.Features.Bookings.DTOs;

public class SubmitPaymentProofRequest
{
    public List<string> ProofUrls { get; set; } = [];
    public string? Note { get; set; }
}
