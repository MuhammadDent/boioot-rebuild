namespace Boioot.Application.Features.BuyerRequests.DTOs;

public record AdminUpdateBuyerRequestDto(
    string Title,
    string Description,
    string PropertyType,
    string? City,
    string? Neighborhood
);
