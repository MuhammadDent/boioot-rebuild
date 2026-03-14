namespace Boioot.Shared.Results;

public class Result<T> : Result
{
    private Result(bool isSuccess, T? value, string? error = null)
        : base(isSuccess, error)
    {
        Value = value;
    }

    public T? Value { get; }

    public static Result<T> Success(T value) => new(true, value);
    public new static Result<T> Failure(string error) => new(false, default, error);
}
