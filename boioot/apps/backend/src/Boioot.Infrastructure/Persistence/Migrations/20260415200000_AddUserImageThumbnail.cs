using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Boioot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddUserImageThumbnail : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── UserImages: add thumbnail columns for optimized image pipeline ──
            // Both nullable for full backward compatibility with existing rows.
            // New uploads (JPEG/PNG/WebP/BMP) will populate both fields automatically.
            // Legacy and SVG/GIF uploads will leave them null.
            migrationBuilder.AddColumn<string>(
                name: "ThumbnailUrl",
                table: "UserImages",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ThumbnailFileKey",
                table: "UserImages",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "ThumbnailUrl",     table: "UserImages");
            migrationBuilder.DropColumn(name: "ThumbnailFileKey", table: "UserImages");
        }
    }
}
