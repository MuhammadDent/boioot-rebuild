using System.ComponentModel.DataAnnotations;
using Boioot.Domain.Enums;

namespace Boioot.Application.Features.Requests.DTOs;

public class UpdateRequestStatusRequest
{
    [Required(ErrorMessage = "حالة الطلب مطلوبة")]
    public RequestStatus? Status { get; set; }
}
