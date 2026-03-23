using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Boioot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<bool>(
                name: "IsRead",
                table: "Notifications",
                type: "INTEGER",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "INTEGER");

            // Cross-provider index creation:
            // SQLite — use IF NOT EXISTS because old EnsureCreated() runs may have
            //          already created these indexes on existing databases.
            // SQL Server (and others) — fresh schema via migrations, use standard CreateIndex.
            if (ActiveProvider == "Microsoft.EntityFrameworkCore.Sqlite")
            {
                migrationBuilder.Sql(
                    "CREATE INDEX IF NOT EXISTS \"IX_Notifications_CreatedAt\" ON \"Notifications\" (\"CreatedAt\")");

                migrationBuilder.Sql(
                    "CREATE INDEX IF NOT EXISTS \"IX_Notifications_UserId_IsRead\" ON \"Notifications\" (\"UserId\", \"IsRead\")");
            }
            else
            {
                migrationBuilder.CreateIndex(
                    name: "IX_Notifications_CreatedAt",
                    table: "Notifications",
                    column: "CreatedAt");

                migrationBuilder.CreateIndex(
                    name: "IX_Notifications_UserId_IsRead",
                    table: "Notifications",
                    columns: new[] { "UserId", "IsRead" });
            }
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Notifications_CreatedAt",
                table: "Notifications");

            migrationBuilder.DropIndex(
                name: "IX_Notifications_UserId_IsRead",
                table: "Notifications");

            migrationBuilder.AlterColumn<bool>(
                name: "IsRead",
                table: "Notifications",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "INTEGER",
                oldDefaultValue: false);
        }
    }
}
