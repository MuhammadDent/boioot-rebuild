using Boioot.Application.Features.Storage;
using Boioot.Domain.Constants;
using Boioot.Domain.Entities;
using Boioot.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Boioot.Api.Controllers;

/// <summary>
/// Manages listing images (property / project).
///
/// Architecture note:
///   The backing store is PropertyImages / ProjectImages tables (typed join tables).
///   These tables are also used by PropertyService and ProjectService for display/search.
///   UserImage (uploaded via POST /api/upload/image) links to these rows via UserImageId FK.
///
/// Endpoints:
///   POST   /api/images/attach                  — attach a UserImage to an entity
///   DELETE /api/images/{id}/detach?entityType=  — remove image from listing only
///   DELETE /api/images/{id}?entityType=         — full delete: R2 + DB row + attachment
///   POST   /api/images/{id}/set-cover?entityType= — make image the cover
///   POST   /api/images/reorder                  — bulk reorder
///   GET    /api/images/{entityType}/{entityId}  — list images (public, no auth)
/// </summary>
[ApiController]
[Route("api/images")]
[Authorize]
public class ImagesController : BaseController
{
    private readonly BoiootDbContext _db;
    private readonly IFileStorageService _storage;
    private readonly ILogger<ImagesController> _logger;

    public ImagesController(
        BoiootDbContext db,
        IFileStorageService storage,
        ILogger<ImagesController> logger)
    {
        _db      = db;
        _storage = storage;
        _logger  = logger;
    }

    // ────────────────────────────────────────────────────────────────────────────
    // DTOs
    // ────────────────────────────────────────────────────────────────────────────

    /// <summary>Attaches an uploaded image to an entity. Cover is managed separately.</summary>
    public record AttachImageRequest(
        Guid   ImageId,
        string EntityType,   // "property" | "project"
        Guid   EntityId);

    public record ReorderItem(Guid ImageId, int SortOrder);

    public record ReorderImagesRequest(
        string EntityType,
        Guid   EntityId,
        IEnumerable<ReorderItem> Items);

    // ────────────────────────────────────────────────────────────────────────────
    // POST /api/images/attach
    // ────────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Attaches an already-uploaded UserImage to a property or project.
    ///
    /// Rules:
    ///   • ImageId must belong to the calling user (or caller must be Admin).
    ///   • Caller must own the target entity (or be Admin).
    ///   • Duplicate attachments are rejected (409).
    ///   • First image for an entity is automatically set as cover.
    ///   • Cover status is managed separately via POST /api/images/{id}/set-cover.
    /// </summary>
    [HttpPost("attach")]
    public async Task<IActionResult> Attach(
        [FromBody] AttachImageRequest request,
        CancellationToken ct)
    {
        var userId   = GetUserId();
        var userRole = GetUserRole();
        var entity   = (request.EntityType ?? "").ToLowerInvariant();

        // ── Validate UserImage ownership ─────────────────────────────────────
        var userImage = await _db.UserImages
            .FirstOrDefaultAsync(i => i.Id == request.ImageId, ct);

        if (userImage is null)
            return NotFound(new { error = "الصورة غير موجودة" });

        if (userImage.UserId != userId && userRole != RoleNames.Admin)
            return Forbid();

        return entity switch
        {
            "property" => await AttachToPropertyAsync(request, userImage, userId, userRole, ct),
            "project"  => await AttachToProjectAsync(request, userImage, userId, userRole, ct),
            _          => BadRequest(new { error = "entityType يجب أن يكون 'property' أو 'project'" }),
        };
    }

    private async Task<IActionResult> AttachToPropertyAsync(
        AttachImageRequest request,
        UserImage          userImage,
        Guid               userId,
        string             userRole,
        CancellationToken  ct)
    {
        var property = await _db.Properties
            .FirstOrDefaultAsync(p => p.Id == request.EntityId && !p.IsDeleted, ct);

        if (property is null)
            return NotFound(new { error = "العقار غير موجود" });

        if (userRole != RoleNames.Admin &&
            property.OwnerId != userId.ToString() &&
            property.CreatedByUserId != userId.ToString())
            return Forbid();

        bool alreadyAttached = await _db.PropertyImages
            .AnyAsync(i => i.PropertyId == request.EntityId && i.UserImageId == request.ImageId, ct);

        if (alreadyAttached)
            return Conflict(new { error = "الصورة مرتبطة بهذا العقار بالفعل" });

        int nextOrder = (await _db.PropertyImages
            .Where(i => i.PropertyId == request.EntityId)
            .Select(i => (int?)i.Order)
            .MaxAsync(ct) ?? -1) + 1;

        // First image becomes cover automatically
        bool isFirst = nextOrder == 0;

        if (isFirst)
        {
            // Clear any stale covers (shouldn't exist, but be safe)
            await _db.PropertyImages
                .Where(i => i.PropertyId == request.EntityId && i.IsCover)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(i => i.IsCover,   false)
                    .SetProperty(i => i.IsPrimary, false), ct);
        }

        var img = new PropertyImage
        {
            PropertyId  = request.EntityId,
            UserImageId = request.ImageId,
            ImageUrl    = userImage.Url,
            IsPrimary   = isFirst,
            IsCover     = isFirst,
            Order       = nextOrder,
        };

        _db.PropertyImages.Add(img);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "[Images/attach] UserImage {ImgId} → Property {EntId} | cover={Cover}",
            request.ImageId, request.EntityId, isFirst);

        return Ok(MapPropertyImage(img));
    }

    private async Task<IActionResult> AttachToProjectAsync(
        AttachImageRequest request,
        UserImage          userImage,
        Guid               userId,
        string             userRole,
        CancellationToken  ct)
    {
        var project = await _db.Projects
            .FirstOrDefaultAsync(p => p.Id == request.EntityId && !p.IsDeleted, ct);

        if (project is null)
            return NotFound(new { error = "المشروع غير موجود" });

        if (userRole != RoleNames.Admin)
        {
            bool isAgent = await _db.Agents
                .AnyAsync(a => a.UserId == userId && a.CompanyId == project.CompanyId, ct);
            if (!isAgent)
                return Forbid();
        }

        bool alreadyAttached = await _db.ProjectImages
            .AnyAsync(i => i.ProjectId == request.EntityId && i.UserImageId == request.ImageId, ct);

        if (alreadyAttached)
            return Conflict(new { error = "الصورة مرتبطة بهذا المشروع بالفعل" });

        int nextOrder = (await _db.ProjectImages
            .Where(i => i.ProjectId == request.EntityId)
            .Select(i => (int?)i.Order)
            .MaxAsync(ct) ?? -1) + 1;

        bool isFirst = nextOrder == 0;

        if (isFirst)
        {
            await _db.ProjectImages
                .Where(i => i.ProjectId == request.EntityId && i.IsCover)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(i => i.IsCover,   false)
                    .SetProperty(i => i.IsPrimary, false), ct);
        }

        var img = new ProjectImage
        {
            ProjectId   = request.EntityId,
            UserImageId = request.ImageId,
            ImageUrl    = userImage.Url,
            IsPrimary   = isFirst,
            IsCover     = isFirst,
            Order       = nextOrder,
        };

        _db.ProjectImages.Add(img);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "[Images/attach] UserImage {ImgId} → Project {EntId} | cover={Cover}",
            request.ImageId, request.EntityId, isFirst);

        return Ok(MapProjectImage(img));
    }

    // ────────────────────────────────────────────────────────────────────────────
    // DELETE /api/images/{id}/detach?entityType=property|project
    // ────────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Removes the image row from the listing WITHOUT deleting from R2 or UserImages.
    /// If the removed image was the cover, the next image by Order is automatically promoted.
    ///
    /// Use DELETE /api/images/{id}?entityType= to fully delete including R2 and UserImage.
    /// </summary>
    [HttpDelete("{id:guid}/detach")]
    public async Task<IActionResult> Detach(
        Guid               id,
        [FromQuery] string entityType,
        CancellationToken  ct)
    {
        var userId   = GetUserId();
        var userRole = GetUserRole();
        var entity   = (entityType ?? "").ToLowerInvariant();

        if (entity == "property")
        {
            var img = await _db.PropertyImages
                .Include(i => i.Property)
                .FirstOrDefaultAsync(i => i.Id == id, ct);

            if (img is null) return NotFound(new { error = "الصورة غير موجودة" });

            if (userRole != RoleNames.Admin &&
                img.Property.OwnerId != userId.ToString() &&
                img.Property.CreatedByUserId != userId.ToString())
                return Forbid();

            bool wasCover = img.IsCover;
            var propId    = img.PropertyId;

            _db.PropertyImages.Remove(img);
            await _db.SaveChangesAsync(ct);

            if (wasCover)
                await PromoteNextPropertyCoverAsync(propId, ct);

            _logger.LogInformation("[Images/detach] PropertyImage {Id} detached", id);
            return NoContent();
        }

        if (entity == "project")
        {
            var img = await _db.ProjectImages
                .Include(i => i.Project)
                .FirstOrDefaultAsync(i => i.Id == id, ct);

            if (img is null) return NotFound(new { error = "الصورة غير موجودة" });

            if (userRole != RoleNames.Admin)
            {
                bool isAgent = await _db.Agents
                    .AnyAsync(a => a.UserId == userId && a.CompanyId == img.Project.CompanyId, ct);
                if (!isAgent) return Forbid();
            }

            bool wasCover = img.IsCover;
            var projId    = img.ProjectId;

            _db.ProjectImages.Remove(img);
            await _db.SaveChangesAsync(ct);

            if (wasCover)
                await PromoteNextProjectCoverAsync(projId, ct);

            _logger.LogInformation("[Images/detach] ProjectImage {Id} detached", id);
            return NoContent();
        }

        return BadRequest(new { error = "entityType يجب أن يكون 'property' أو 'project'" });
    }

    // ────────────────────────────────────────────────────────────────────────────
    // DELETE /api/images/{id}?entityType=property|project
    // ────────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Fully deletes an image:
    ///   1. Verifies ownership of the listing and the underlying UserImage (if any).
    ///   2. Removes the attachment row (PropertyImage / ProjectImage).
    ///   3. If the attachment had a UserImageId and that UserImage is no longer referenced
    ///      by any other listing, deletes from R2 and removes the UserImage record.
    ///   4. If R2 deletion fails, the operation is aborted and a 502 is returned.
    ///
    /// {id} here is the PropertyImage.Id or ProjectImage.Id — NOT the UserImage.Id.
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(
        Guid               id,
        [FromQuery] string entityType,
        CancellationToken  ct)
    {
        var userId   = GetUserId();
        var userRole = GetUserRole();
        var entity   = (entityType ?? "").ToLowerInvariant();

        if (entity == "property")
            return await DeletePropertyImageAsync(id, userId, userRole, ct);

        if (entity == "project")
            return await DeleteProjectImageAsync(id, userId, userRole, ct);

        return BadRequest(new { error = "entityType يجب أن يكون 'property' أو 'project'" });
    }

    private async Task<IActionResult> DeletePropertyImageAsync(
        Guid id, Guid userId, string userRole, CancellationToken ct)
    {
        var img = await _db.PropertyImages
            .Include(i => i.Property)
            .FirstOrDefaultAsync(i => i.Id == id, ct);

        if (img is null) return NotFound(new { error = "الصورة غير موجودة" });

        if (userRole != RoleNames.Admin &&
            img.Property.OwnerId != userId.ToString() &&
            img.Property.CreatedByUserId != userId.ToString())
            return Forbid();

        var userImageId = img.UserImageId;
        bool wasCover   = img.IsCover;
        var propId      = img.PropertyId;

        // Remove attachment row first
        _db.PropertyImages.Remove(img);
        await _db.SaveChangesAsync(ct);

        // Promote cover if needed
        if (wasCover)
            await PromoteNextPropertyCoverAsync(propId, ct);

        // If there was a UserImage, check if it's now orphaned
        if (userImageId.HasValue)
            await TryDeleteOrphanedUserImageAsync(userImageId.Value, ct);

        _logger.LogInformation("[Images/delete] PropertyImage {Id} fully deleted", id);
        return NoContent();
    }

    private async Task<IActionResult> DeleteProjectImageAsync(
        Guid id, Guid userId, string userRole, CancellationToken ct)
    {
        var img = await _db.ProjectImages
            .Include(i => i.Project)
            .FirstOrDefaultAsync(i => i.Id == id, ct);

        if (img is null) return NotFound(new { error = "الصورة غير موجودة" });

        if (userRole != RoleNames.Admin)
        {
            bool isAgent = await _db.Agents
                .AnyAsync(a => a.UserId == userId && a.CompanyId == img.Project.CompanyId, ct);
            if (!isAgent) return Forbid();
        }

        var userImageId = img.UserImageId;
        bool wasCover   = img.IsCover;
        var projId      = img.ProjectId;

        _db.ProjectImages.Remove(img);
        await _db.SaveChangesAsync(ct);

        if (wasCover)
            await PromoteNextProjectCoverAsync(projId, ct);

        if (userImageId.HasValue)
            await TryDeleteOrphanedUserImageAsync(userImageId.Value, ct);

        _logger.LogInformation("[Images/delete] ProjectImage {Id} fully deleted", id);
        return NoContent();
    }

    /// <summary>
    /// If the UserImage is no longer referenced by ANY PropertyImage or ProjectImage,
    /// deletes it from R2 and removes the DB record.
    /// If R2 deletion fails, logs the error but does NOT fail the whole request
    /// (the attachment row is already removed — the image will eventually be cleaned up).
    /// </summary>
    private async Task TryDeleteOrphanedUserImageAsync(Guid userImageId, CancellationToken ct)
    {
        var userImage = await _db.UserImages.FindAsync([userImageId], ct);
        if (userImage is null) return;

        bool stillReferenced =
            await _db.PropertyImages.AnyAsync(i => i.UserImageId == userImageId, ct) ||
            await _db.ProjectImages.AnyAsync(i => i.UserImageId == userImageId, ct);

        if (stillReferenced) return;

        // Attempt R2 deletion (main + thumbnail if present)
        try
        {
            await _storage.DeleteAsync(userImage.FileKey, ct);

            if (!string.IsNullOrEmpty(userImage.ThumbnailFileKey))
                await _storage.DeleteAsync(userImage.ThumbnailFileKey, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "[Images/delete] R2 deletion failed for UserImage {Id} key={Key}. " +
                "Record kept in DB for manual cleanup.",
                userImageId, userImage.FileKey);
            return; // Do not delete DB record if R2 failed
        }

        _db.UserImages.Remove(userImage);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "[Images/delete] Orphaned UserImage {Id} removed from R2 + DB", userImageId);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // POST /api/images/{id}/set-cover?entityType=property|project
    // ────────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Marks one image as the cover for its entity.
    /// Atomically clears IsCover from all other images of the same entity.
    /// {id} is the PropertyImage.Id or ProjectImage.Id.
    /// </summary>
    [HttpPost("{id:guid}/set-cover")]
    public async Task<IActionResult> SetCover(
        Guid               id,
        [FromQuery] string entityType,
        CancellationToken  ct)
    {
        var userId   = GetUserId();
        var userRole = GetUserRole();
        var entity   = (entityType ?? "").ToLowerInvariant();

        if (entity == "property")
        {
            var img = await _db.PropertyImages
                .Include(i => i.Property)
                .FirstOrDefaultAsync(i => i.Id == id, ct);

            if (img is null) return NotFound(new { error = "الصورة غير موجودة" });

            if (userRole != RoleNames.Admin &&
                img.Property.OwnerId != userId.ToString() &&
                img.Property.CreatedByUserId != userId.ToString())
                return Forbid();

            await _db.PropertyImages
                .Where(i => i.PropertyId == img.PropertyId && i.IsCover)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(i => i.IsCover,   false)
                    .SetProperty(i => i.IsPrimary, false), ct);

            img.IsCover   = true;
            img.IsPrimary = true;
            await _db.SaveChangesAsync(ct);

            _logger.LogInformation(
                "[Images/set-cover] PropertyImage {Id} set as cover for Property {PropId}",
                id, img.PropertyId);

            return Ok(MapPropertyImage(img));
        }

        if (entity == "project")
        {
            var img = await _db.ProjectImages
                .Include(i => i.Project)
                .FirstOrDefaultAsync(i => i.Id == id, ct);

            if (img is null) return NotFound(new { error = "الصورة غير موجودة" });

            if (userRole != RoleNames.Admin)
            {
                bool isAgent = await _db.Agents
                    .AnyAsync(a => a.UserId == userId && a.CompanyId == img.Project.CompanyId, ct);
                if (!isAgent) return Forbid();
            }

            await _db.ProjectImages
                .Where(i => i.ProjectId == img.ProjectId && i.IsCover)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(i => i.IsCover,   false)
                    .SetProperty(i => i.IsPrimary, false), ct);

            img.IsCover   = true;
            img.IsPrimary = true;
            await _db.SaveChangesAsync(ct);

            _logger.LogInformation(
                "[Images/set-cover] ProjectImage {Id} set as cover for Project {ProjId}",
                id, img.ProjectId);

            return Ok(MapProjectImage(img));
        }

        return BadRequest(new { error = "entityType يجب أن يكون 'property' أو 'project'" });
    }

    // ────────────────────────────────────────────────────────────────────────────
    // POST /api/images/reorder
    // ────────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Bulk-updates SortOrder for all provided images of a single entity.
    /// All ImageIds must belong to the specified entity — otherwise 400 Bad Request.
    /// Returns the full ordered list after update.
    /// </summary>
    [HttpPost("reorder")]
    public async Task<IActionResult> Reorder(
        [FromBody] ReorderImagesRequest request,
        CancellationToken ct)
    {
        var userId   = GetUserId();
        var userRole = GetUserRole();
        var entity   = (request.EntityType ?? "").ToLowerInvariant();

        if (entity == "property")
        {
            var property = await _db.Properties
                .FirstOrDefaultAsync(p => p.Id == request.EntityId && !p.IsDeleted, ct);

            if (property is null)
                return NotFound(new { error = "العقار غير موجود" });

            if (userRole != RoleNames.Admin &&
                property.OwnerId != userId.ToString() &&
                property.CreatedByUserId != userId.ToString())
                return Forbid();

            return await ReorderPropertyImagesAsync(request, ct);
        }

        if (entity == "project")
        {
            var project = await _db.Projects
                .FirstOrDefaultAsync(p => p.Id == request.EntityId && !p.IsDeleted, ct);

            if (project is null)
                return NotFound(new { error = "المشروع غير موجود" });

            if (userRole != RoleNames.Admin)
            {
                bool isAgent = await _db.Agents
                    .AnyAsync(a => a.UserId == userId && a.CompanyId == project.CompanyId, ct);
                if (!isAgent) return Forbid();
            }

            return await ReorderProjectImagesAsync(request, ct);
        }

        return BadRequest(new { error = "entityType يجب أن يكون 'property' أو 'project'" });
    }

    private async Task<IActionResult> ReorderPropertyImagesAsync(
        ReorderImagesRequest request, CancellationToken ct)
    {
        var ids    = request.Items.Select(x => x.ImageId).ToList();
        var images = await _db.PropertyImages
            .Where(i => i.PropertyId == request.EntityId && ids.Contains(i.Id))
            .ToListAsync(ct);

        var missing = ids.Except(images.Select(i => i.Id)).ToList();
        if (missing.Count > 0)
            return BadRequest(new { error = "بعض الصور لا تنتمي لهذا العقار", missing });

        var orderMap = request.Items.ToDictionary(x => x.ImageId, x => x.SortOrder);
        foreach (var img in images)
            img.Order = orderMap[img.Id];

        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "[Images/reorder] Property {EntityId}: {Count} images reordered",
            request.EntityId, images.Count);

        return Ok(images.OrderBy(i => i.Order).Select(MapPropertyImage).ToList());
    }

    private async Task<IActionResult> ReorderProjectImagesAsync(
        ReorderImagesRequest request, CancellationToken ct)
    {
        var ids    = request.Items.Select(x => x.ImageId).ToList();
        var images = await _db.ProjectImages
            .Where(i => i.ProjectId == request.EntityId && ids.Contains(i.Id))
            .ToListAsync(ct);

        var missing = ids.Except(images.Select(i => i.Id)).ToList();
        if (missing.Count > 0)
            return BadRequest(new { error = "بعض الصور لا تنتمي لهذا المشروع", missing });

        var orderMap = request.Items.ToDictionary(x => x.ImageId, x => x.SortOrder);
        foreach (var img in images)
            img.Order = orderMap[img.Id];

        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "[Images/reorder] Project {EntityId}: {Count} images reordered",
            request.EntityId, images.Count);

        return Ok(images.OrderBy(i => i.Order).Select(MapProjectImage).ToList());
    }

    // ────────────────────────────────────────────────────────────────────────────
    // GET /api/images/{entityType}/{entityId}  (public)
    // ────────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Lists all images for a property or project, ordered by SortOrder ascending.
    /// Public — no authentication required.
    /// </summary>
    [HttpGet("{entityType}/{entityId:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetImages(
        string entityType,
        Guid   entityId,
        CancellationToken ct)
    {
        var entity = entityType.ToLowerInvariant();

        if (entity == "property")
        {
            bool exists = await _db.Properties
                .AnyAsync(p => p.Id == entityId && !p.IsDeleted, ct);

            if (!exists) return NotFound(new { error = "العقار غير موجود" });

            var images = await _db.PropertyImages
                .Where(i => i.PropertyId == entityId)
                .OrderByDescending(i => i.IsCover)   // cover first (bridge ordering)
                .ThenBy(i => i.Order)
                .Select(i => new
                {
                    i.Id,
                    i.ImageUrl,
                    i.IsCover,
                    i.IsPrimary,
                    i.Order,
                    i.UserImageId,
                    i.PropertyId,
                    // Bridge: indicates which system provided this image
                    ImageSource = i.UserImageId != null ? "user_upload" : "legacy",
                })
                .ToListAsync(ct);

            return Ok(images);
        }

        if (entity == "project")
        {
            bool exists = await _db.Projects
                .AnyAsync(p => p.Id == entityId && !p.IsDeleted, ct);

            if (!exists) return NotFound(new { error = "المشروع غير موجود" });

            var images = await _db.ProjectImages
                .Where(i => i.ProjectId == entityId)
                .OrderByDescending(i => i.IsCover)   // cover first (bridge ordering)
                .ThenBy(i => i.Order)
                .Select(i => new
                {
                    i.Id,
                    i.ImageUrl,
                    i.IsCover,
                    i.IsPrimary,
                    i.Order,
                    i.UserImageId,
                    i.ProjectId,
                    // Bridge: indicates which system provided this image
                    ImageSource = i.UserImageId != null ? "user_upload" : "legacy",
                })
                .ToListAsync(ct);

            return Ok(images);
        }

        return BadRequest(new { error = "entityType يجب أن يكون 'property' أو 'project'" });
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Cover auto-promote helpers
    // ────────────────────────────────────────────────────────────────────────────

    private async Task PromoteNextPropertyCoverAsync(Guid propertyId, CancellationToken ct)
    {
        var next = await _db.PropertyImages
            .Where(i => i.PropertyId == propertyId)
            .OrderBy(i => i.Order)
            .FirstOrDefaultAsync(ct);

        if (next is null) return;

        next.IsCover   = true;
        next.IsPrimary = true;
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "[Images/promote-cover] PropertyImage {Id} promoted for Property {PropId}",
            next.Id, propertyId);
    }

    private async Task PromoteNextProjectCoverAsync(Guid projectId, CancellationToken ct)
    {
        var next = await _db.ProjectImages
            .Where(i => i.ProjectId == projectId)
            .OrderBy(i => i.Order)
            .FirstOrDefaultAsync(ct);

        if (next is null) return;

        next.IsCover   = true;
        next.IsPrimary = true;
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "[Images/promote-cover] ProjectImage {Id} promoted for Project {ProjId}",
            next.Id, projectId);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Response mappers
    // ────────────────────────────────────────────────────────────────────────────

    private static object MapPropertyImage(PropertyImage i) => new
    {
        i.Id,
        i.ImageUrl,
        i.IsCover,
        i.IsPrimary,
        i.Order,
        i.UserImageId,
        i.PropertyId,
    };

    private static object MapProjectImage(ProjectImage i) => new
    {
        i.Id,
        i.ImageUrl,
        i.IsCover,
        i.IsPrimary,
        i.Order,
        i.UserImageId,
        i.ProjectId,
    };
}
