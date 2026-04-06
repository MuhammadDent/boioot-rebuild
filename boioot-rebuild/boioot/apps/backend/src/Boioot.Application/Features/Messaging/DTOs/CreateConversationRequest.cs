using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.Messaging.DTOs;

public class CreateConversationRequest
{
    [Required(ErrorMessage = "معرف المستلم مطلوب")]
    public Guid? RecipientId { get; set; }

    public Guid? PropertyId { get; set; }
    public Guid? ProjectId { get; set; }
}
