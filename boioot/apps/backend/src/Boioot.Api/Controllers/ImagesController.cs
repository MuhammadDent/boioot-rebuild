using Boioot.Domain.Constants;
using Boioot.Domain.Entities;
using Boioot.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Boioot.Api.Controllers;

/// <summary>
/// Manages the lifecycle of images attached to entity listings (properties / projects).
///
/// Routes:
///   POST   /api/images/attach           — attach a UserImage to a property or project
///   DELETE /api/images/{id}/detach      — remove image from listing (does NOT delete from storage)
///   POST   /api/images/{id}/set-cover   — mark one image as the cover for its entity
///   POST   /api/images/reorder          — bulk-update sort order for an entity's images
///   GET    /api/images/{entityType}/{entityId} — list images for an entity (public)
/// </summary>
[ApiController]
[Route("api/images")]
[Authorize]
public class ImagesController : BaseController
{
    private readonly BoiootDbContext _db;
    private readonly ILogger<ImagesController> _logger;

    public ImagesController(BoiootDbContext db, ILogger<ImagesController> logger)
    {
        _db     = db;
        _logger = logger;
    }

    // ────────────────────────────────────────────────────────────────────────────
    // DTOs
    // ────────────────────────────────────────────────────────────────────────────

    public record AttachImageRequest(
        Guid   ImageId,
        string EntityType,   // "property" | "project"
        Guid   EntityId,
        bool   IsCover = false);

    public record ReorderItem(Guid ImageId, int SortOrder);

    public record ReorderRequest(
        string EntityType,
        Guid   EntityId,
        IEnumerable<ReorderItem> Items);

    // ────────────────────────────────────────────────────────────────────────────
    // POST /api/images/attach
    // ────────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Attaches an already-uploaded UserImage to a property or project.
    /// The UserImage must belong to the calling user.
    /// The caller must own (or admin) the target entity.
    ///
    /// If IsCover = true, all other images for the same entity are cleared from cover status.
    /// If this is the first image for the entity, it is automatically set as cover.
    /// </summary>
    [HttpPost("attach")]
    public async Task<IActionResult> Attach(
        [FromBody] AttachImageRequest request,
        CancellationToken ct)
    {
        var userId    = GetUserId();
        var userRole  = GetUserRole();
        var entity    = request.EntityType.ToLowerInvariant();

        // ── Validate UserImage ownership ─────────────────────────────────────
        var userImage = await _db.UserImages
            .FirstOrDefaultAsync(i => i.Id == request.ImageId, ct);

        if (userImage is null)
            return NotFound(new { error = "الصورة غير موجودة" });

        if (userImage.UserId != userId && userRole != RoleNames.Admin)
            return Forbid();

        // ── Route by entity type ──────────────────────────────────────────────
        if (entity == "property")
            return await AttachToPropertyAsync(request, userImage, userId, userRole, ct);

        if (entity == "project")
            return await AttachToProjectAsync(request, userImage, userId, userRole, ct);

        return BadRequest(new { error = "entityType يجب أن يكون 'property' أو 'project'" });
    }

    // ── Property attachment ──────────────────────────────────────────────────

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

        bool isFirstImage = nextOrder == 0;
        bool isCover      = request.IsCover || isFirstImage;

        // Clear existing covers if this one is becoming cover
        if (isCover)
        {
            await _db.PropertyImages
                .Where(i => i.PropertyId == request.EntityId && i.IsCover)
                .ExecuteUpdateAsync(s => s.SetProperty(i => i.IsCover, false), ct);
        }

        var img = new PropertyImage
        {
            PropertyId  = request.EntityId,
            UserImageId = request.ImageId,
            ImageUrl    = userImage.Url,
            IsPrimary   = isCover,
            IsCover     = isCover,
            Order       = nextOrder,
        };

        _db.PropertyImages.Add(img);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "[Images/attach] UserImage {ImageId} → Property {EntityId} | cover={IsCover}",
            request.ImageId, request.EntityId, isCover);

        return Ok(MapPropertyImage(img));
    }

    // ── Project attachment ────────────────────────────────────────────────────

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

        bool isFirstImage = nextOrder == 0;
        bool isCover      = request.IsCover || isFirstImage;

        if (isCover)
        {
            await _db.ProjectImages
                .Where(i => i.ProjectId == request.EntityId && i.IsCover)
                .ExecuteUpdateAsync(s => s.SetProperty(i => i.IsCover, false), ct);
        }

        var img = new ProjectImage
        {
            ProjectId   = request.EntityId,
            UserImageId = request.ImageId,
            ImageUrl    = userImage.Url,
            IsPrimary   = isCover,
            IsCover     = isCover,
            Order       = nextOrder,
        };

        _db.ProjectImages.Add(img);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "[Images/attach] UserImage {ImageId} → Project {EntityId} | cover={IsCover}",
            request.ImageId, request.EntityId, isCover);

        return Ok(MapProjectImage(img));
    }

    // ────────────────────────────────────────────────────────────────────────────
    // DELETE /api/images/{id}/detach?entityType=property|project
    // ────────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Removes an image attachment from a listing WITHOUT deleting the UserImage or the file in storage.
    /// If the removed image was the cover, the next image by Order is automatically promoted to cover.
    /// </summary>
    [HttpDelete("{id:guid}/detach")]
    public async Task<IActionResult> Detach(
        Guid   id,
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

            _logger.LogInformation("[Images/detach] PropertyImage {Id} removed", id);
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

            _logger.LogInformation("[Images/detach] ProjectImage {Id} removed", id);
            return NoContent();
        }

        return BadRequest(new { error = "entityType يجب أن يكون 'property' أو 'project'" });
    }

    // ── Auto-promote cover helpers ─────────────────────────────────────────────

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
            "[Images/promote-cover] PropertyImage {Id} promoted to cover for Property {PropId}",
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
            "[Images/promote-cover] ProjectImage {Id} promoted to cover for Project {ProjId}",
            next.Id, projectId);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // POST /api/images/{id}/set-cover?entityType=property|project
    // ────────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Marks a single image as the cover for its entity.
    /// Clears IsCover from all other images of the same entity atomically.
    /// </summary>
    [HttpPost("{id:guid}/set-cover")]
    public async Task<IActionResult> SetCover(
        Guid   id,
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

            // Clear all covers for this property, then set the target
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
    /// Bulk-updates the SortOrder of images for a single entity.
    /// All imageIds in the request must belong to the specified entity.
    /// Returns the full ordered list after the update.
    /// </summary>
    [HttpPost("reorder")]
    public async Task<IActionResult> Reorder(
        [FromBody] ReorderRequest request,
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

            var ids    = request.Items.Select(x => x.ImageId).ToList();
            var images = await _db.PropertyImages
                .Where(i => i.PropertyId == request.EntityId && ids.Contains(i.Id))
                .ToListAsync(ct);

            // Validate that all IDs belong to this property
            var found = images.Select(i => i.Id).ToHashSet();
            var missing = ids.Where(id => !found.Contains(id)).ToList();
            if (missing.Count > 0)
                return BadRequest(new { error = "بعض الصور لا تنتمي لهذا العقار", missing });

            // Apply new orders
            var orderMap = request.Items.ToDictionary(x => x.ImageId, x => x.SortOrder);
            foreach (var img in images)
                img.Order = orderMap[img.Id];

            await _db.SaveChangesAsync(ct);

            var result = images.OrderBy(i => i.Order).Select(MapPropertyImage).ToList();

            _logger.LogInformation(
                "[Images/reorder] Property {EntityId}: {Count} images reordered", 
                request.EntityId, images.Count);

            return Ok(result);
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

            var ids    = request.Items.Select(x => x.ImageId).ToList();
            var images = await _db.ProjectImages
                .Where(i => i.ProjectId == request.EntityId && ids.Contains(i.Id))
                .ToListAsync(ct);

            var found = images.Select(i => i.Id).ToHashSet();
            var missing = ids.Where(id => !found.Contains(id)).ToList();
            if (missing.Count > 0)
                return BadRequest(new { error = "بعض الصور لا تنتمي لهذا المشروع", missing });

            var orderMap = request.Items.ToDictionary(x => x.ImageId, x => x.SortOrder);
            foreach (var img in images)
                img.Order = orderMap[img.Id];

            await _db.SaveChangesAsync(ct);

            var result = images.OrderBy(i => i.Order).Select(MapProjectImage).ToList();

            _logger.LogInformation(
                "[Images/reorder] Project {EntityId}: {Count} images reordered",
                request.EntityId, images.Count);

            return Ok(result);
        }

        return BadRequest(new { error = "entityType يجب أن يكون 'property' أو 'project'" });
    }

    // ────────────────────────────────────────────────────────────────────────────
    // GET /api/images/{entityType}/{entityId}
    // ────────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Returns all images for a property or project, ordered by SortOrder.
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

            if (!exists)
                return NotFound(new { error = "العقار غير موجود" });

            var images = await _db.PropertyImages
                .Where(i => i.PropertyId == entityId)
                .OrderBy(i => i.Order)
                .Select(i => new
                {
                    i.Id,
                    i.ImageUrl,
                    i.IsCover,
                    i.IsPrimary,
                    i.Order,
                    i.UserImageId,
                    i.PropertyId,
                })
                .ToListAsync(ct);

            return Ok(images);
        }

        if (entity == "project")
        {
            bool exists = await _db.Projects
                .AnyAsync(p => p.Id == entityId && !p.IsDeleted, ct);

            if (!exists)
                return NotFound(new { error = "المشروع غير موجود" });

            var images = await _db.ProjectImages
                .Where(i => i.ProjectId == entityId)
                .OrderBy(i => i.Order)
                .Select(i => new
                {
                    i.Id,
                    i.ImageUrl,
                    i.IsCover,
                    i.IsPrimary,
                    i.Order,
                    i.UserImageId,
                    i.ProjectId,
                })
                .ToListAsync(ct);

            return Ok(images);
        }

        return BadRequest(new { error = "entityType يجب أن يكون 'property' أو 'project'" });
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Mapping helpers
    // ────────────────────────────────────────────────────────────────────────────

    private static object MapPropertyImage(PropertyImage i) => new
    {
        i.Id,
        i.ImageUrl,
        i.IsCover,
        IsPrimary = i.IsPrimary, // kept for legacy clients
        i.Order,
        i.UserImageId,
        i.PropertyId,
    };

    private static object MapProjectImage(ProjectImage i) => new
    {
        i.Id,
        i.ImageUrl,
        i.IsCover,
        IsPrimary = i.IsPrimary,
        i.Order,
        i.UserImageId,
        i.ProjectId,
    };
}
