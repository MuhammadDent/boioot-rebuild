using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Boioot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddUserImageFKToListingImages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "UserImageId",
                table: "PropertyImages",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UserImageId",
                table: "ProjectImages",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_PropertyImages_UserImageId",
                table: "PropertyImages",
                column: "UserImageId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectImages_UserImageId",
                table: "ProjectImages",
                column: "UserImageId");

            migrationBuilder.AddForeignKey(
                name: "FK_PropertyImages_UserImages_UserImageId",
                table: "PropertyImages",
                column: "UserImageId",
                principalTable: "UserImages",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_ProjectImages_UserImages_UserImageId",
                table: "ProjectImages",
                column: "UserImageId",
                principalTable: "UserImages",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PropertyImages_UserImages_UserImageId",
                table: "PropertyImages");

            migrationBuilder.DropForeignKey(
                name: "FK_ProjectImages_UserImages_UserImageId",
                table: "ProjectImages");

            migrationBuilder.DropIndex(
                name: "IX_PropertyImages_UserImageId",
                table: "PropertyImages");

            migrationBuilder.DropIndex(
                name: "IX_ProjectImages_UserImageId",
                table: "ProjectImages");

            migrationBuilder.DropColumn(
                name: "UserImageId",
                table: "PropertyImages");

            migrationBuilder.DropColumn(
                name: "UserImageId",
                table: "ProjectImages");
        }
    }
}
