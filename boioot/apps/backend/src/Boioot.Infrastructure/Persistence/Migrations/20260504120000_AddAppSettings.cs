using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Boioot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAppSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS ""AppSettings"" (
                    ""Key""   TEXT NOT NULL,
                    ""Value"" TEXT NOT NULL DEFAULT 'true',
                    CONSTRAINT ""PK_AppSettings"" PRIMARY KEY (""Key"")
                );
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"DROP TABLE IF EXISTS ""AppSettings"";");
        }
    }
}
