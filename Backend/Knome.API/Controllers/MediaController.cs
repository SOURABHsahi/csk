using System.Threading.Tasks;
using Knome.API.Exceptions;
using Knome.API.Interfaces;
using Knome.API.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Knome.API.Controllers;

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
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public async Task<IActionResult> UploadMedia([FromForm] IFormFile file, [FromForm] string type = "doc")
    {
        if (file == null)
            throw new BadRequestException("No file provided.");

        var url = await _fileStorageService.SaveMediaAsync(file, type);
        
        return Ok(ApiResponse<object>.SuccessResponse(200, "File uploaded successfully.", new { url }));
    }
}
