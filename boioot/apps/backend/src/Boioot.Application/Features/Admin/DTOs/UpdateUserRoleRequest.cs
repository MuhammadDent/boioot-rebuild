using Boioot.Domain.Enums;
using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.Admin.DTOs;

public class UpdateUserRoleRequest
{
    [Required]
    public UserRole? Role { get; set; }
}
