using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.BuyerRequests.DTOs;

public class AddCommentDto
{
    [Required(ErrorMessage = "نص التعليق مطلوب")]
    [MinLength(2,  ErrorMessage = "التعليق يجب أن لا يقل عن حرفين")]
    [MaxLength(2000, ErrorMessage = "التعليق يجب أن لا يتجاوز 2000 حرف")]
    public string Content { get; set; } = string.Empty;
}
