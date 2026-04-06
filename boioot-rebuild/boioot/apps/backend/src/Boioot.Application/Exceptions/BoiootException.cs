namespace Boioot.Application.Exceptions;

public class BoiootException : Exception
{
    public int StatusCode { get; }

    /// <summary>
    /// رمز الخطأ البنيوي — يُستخدم في الواجهة الأمامية للكشف عن حالات محددة
    /// مثال: TRIAL_LIMIT_REACHED
    /// </summary>
    public string? ErrorCode { get; }

    public BoiootException(string message, int statusCode = 400, string? errorCode = null)
        : base(message)
    {
        StatusCode = statusCode;
        ErrorCode  = errorCode;
    }
}
