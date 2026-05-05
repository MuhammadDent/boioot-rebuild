using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Boioot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ExpandAgencyProfile : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Ensure table exists first (idempotent — may have been created by EnsureTableAsync)
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS ""AgencyProfiles"" (
                    ""UserId""     TEXT    NOT NULL,
                    ""Bio""        TEXT,
                    ""City""       TEXT,
                    ""LogoUrl""    TEXT,
                    ""IsVisible""  BOOLEAN NOT NULL DEFAULT false,
                    ""IsFeatured"" BOOLEAN NOT NULL DEFAULT false,
                    ""SortOrder""  INTEGER NOT NULL DEFAULT 0,
                    ""UpdatedAt""  TIMESTAMP WITH TIME ZONE,
                    CONSTRAINT ""PK_AgencyProfiles"" PRIMARY KEY (""UserId"")
                );
            ");

            // Add new columns (idempotent — IF NOT EXISTS)
            migrationBuilder.Sql(@"ALTER TABLE ""AgencyProfiles"" ADD COLUMN IF NOT EXISTS ""BusinessName"" TEXT;");
            migrationBuilder.Sql(@"ALTER TABLE ""AgencyProfiles"" ADD COLUMN IF NOT EXISTS ""Province""     TEXT;");
            migrationBuilder.Sql(@"ALTER TABLE ""AgencyProfiles"" ADD COLUMN IF NOT EXISTS ""ContactNumber"" TEXT;");
            migrationBuilder.Sql(@"ALTER TABLE ""AgencyProfiles"" ADD COLUMN IF NOT EXISTS ""WhatsappLink""  TEXT;");
            migrationBuilder.Sql(@"ALTER TABLE ""AgencyProfiles"" ADD COLUMN IF NOT EXISTS ""Address""       TEXT;");
            migrationBuilder.Sql(@"ALTER TABLE ""AgencyProfiles"" ADD COLUMN IF NOT EXISTS ""WebsiteUrl""    TEXT;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"ALTER TABLE ""AgencyProfiles"" DROP COLUMN IF EXISTS ""BusinessName"";");
            migrationBuilder.Sql(@"ALTER TABLE ""AgencyProfiles"" DROP COLUMN IF EXISTS ""Province"";");
            migrationBuilder.Sql(@"ALTER TABLE ""AgencyProfiles"" DROP COLUMN IF EXISTS ""ContactNumber"";");
            migrationBuilder.Sql(@"ALTER TABLE ""AgencyProfiles"" DROP COLUMN IF EXISTS ""WhatsappLink"";");
            migrationBuilder.Sql(@"ALTER TABLE ""AgencyProfiles"" DROP COLUMN IF EXISTS ""Address"";");
            migrationBuilder.Sql(@"ALTER TABLE ""AgencyProfiles"" DROP COLUMN IF EXISTS ""WebsiteUrl"";");
        }
    }
}
