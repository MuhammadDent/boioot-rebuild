namespace Boioot.Application.Features.Notifications.Interfaces;

public interface INotificationEventDispatcher
{
    void DispatchBuyerRequestCreated(Guid buyerRequestId, Guid actorUserId);
}