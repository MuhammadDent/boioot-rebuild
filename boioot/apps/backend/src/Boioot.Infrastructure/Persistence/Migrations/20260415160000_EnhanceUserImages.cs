using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Boioot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class EnhanceUserImages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── UserImages: add optional metadata columns ─────────────────────
            // All nullable for full backward compatibility with existing rows.
            migrationBuilder.AddColumn<string>(
                name: "OriginalFileName",
                table: "UserImages",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MimeType",
                table: "UserImages",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "SizeBytes",
                table: "UserImages",
                nullable: true);

            // ── PropertyImages: add IsCover column ────────────────────────────
            // IsPrimary is kept for backward compat; IsCover is the canonical cover flag.
            // Not specifying 'type' lets EF use the correct DB-native boolean.
            migrationBuilder.AddColumn<bool>(
                name: "IsCover",
                table: "PropertyImages",
                defaultValue: false,
                nullable: false);

            // ── ProjectImages: add IsCover column ─────────────────────────────
            migrationBuilder.AddColumn<bool>(
                name: "IsCover",
                table: "ProjectImages",
                defaultValue: false,
                nullable: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "OriginalFileName", table: "UserImages");
            migrationBuilder.DropColumn(name: "MimeType",         table: "UserImages");
            migrationBuilder.DropColumn(name: "SizeBytes",        table: "UserImages");
            migrationBuilder.DropColumn(name: "IsCover",          table: "PropertyImages");
            migrationBuilder.DropColumn(name: "IsCover",          table: "ProjectImages");
        }
    }
}
