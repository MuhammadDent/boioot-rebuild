namespace Boioot.Application.Exceptions;

public class BoiootException : Exception
{
    public int StatusCode { get; }

    public BoiootException(string message, int statusCode = 400) : base(message)
    {
        StatusCode = statusCode;
    }
}
