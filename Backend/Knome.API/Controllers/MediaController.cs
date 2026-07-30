using System.Threading.Tasks;
using Knome.API.Exceptions;
using Knome.API.Interfaces;
using Knome.API.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Knome.API.Controllers;

public class UploadMediaDto
{
    public IFormFile File { get; set; } = null!;
    public string Type { get; set; } = "doc";
}

[Authorize]
[ApiController]
[Route("api/media")]
public class MediaController : KnomeControllerBase
{
    private readonly IFileStorageService _fileStorageService;

    public MediaController(IFileStorageService fileStorageService)
    {
        _fileStorageService = fileStorageService;
    }

    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<IActionResult> UploadMedia([FromForm] UploadMediaDto dto)
    {
        if (dto.File == null)
            throw new BadRequestException("No file provided.");

        var url = await _fileStorageService.SaveMediaAsync(dto.File, dto.Type);
        
        return Ok(ApiResponse<object>.SuccessResponse(200, "File uploaded successfully.", new { url }));
    }
}
