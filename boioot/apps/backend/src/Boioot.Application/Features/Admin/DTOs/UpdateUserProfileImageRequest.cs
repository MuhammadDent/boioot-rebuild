using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.Admin.DTOs;

public class UpdateUserProfileImageRequest
{
    [Required] public string ProfileImageUrl { get; set; } = string.Empty;
}
