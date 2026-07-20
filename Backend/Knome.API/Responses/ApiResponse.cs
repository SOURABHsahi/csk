using System.Collections.Generic;

namespace Knome.API.Responses;

public class ApiResponse
{
    public bool Success { get; set; }
    public int StatusCode { get; set; }
    public string Message { get; set; } = string.Empty;
    public List<string>? Errors { get; set; }

    public ApiResponse()
    {
    }

    public ApiResponse(bool success, int statusCode, string message, List<string>? errors = null)
    {
        Success = success;
        StatusCode = statusCode;
        Message = message;
        Errors = errors;
    }

    public static ApiResponse SuccessResponse(int statusCode, string message)
    {
        return new ApiResponse(true, statusCode, message);
    }

    public static ApiResponse FailureResponse(int statusCode, string message, List<string>? errors = null)
    {
        return new ApiResponse(false, statusCode, message, errors);
    }
}

public class ApiResponse<T> : ApiResponse
{
    public T? Data { get; set; }

    public ApiResponse()
    {
    }

    public ApiResponse(bool success, int statusCode, string message, T? data, List<string>? errors = null)
        : base(success, statusCode, message, errors)
    {
        Data = data;
    }

    public static ApiResponse<T> SuccessResponse(int statusCode, string message, T? data)
    {
        return new ApiResponse<T>(true, statusCode, message, data);
    }

    public static new ApiResponse<T> FailureResponse(int statusCode, string message, List<string>? errors = null)
    {
        return new ApiResponse<T>(false, statusCode, message, default, errors);
    }
}
