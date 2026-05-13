using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Boioot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddStaticPages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS ""StaticPages"" (
                    ""Id""                  character varying(36)  NOT NULL,
                    ""Slug""                VARCHAR(100)  NOT NULL,
                    ""TitleAr""             VARCHAR(200)  NOT NULL,
                    ""ContentAr""           TEXT          NULL,
                    ""MetaDescriptionAr""   VARCHAR(500)  NULL,
                    ""IsActive""            BOOLEAN       NOT NULL DEFAULT TRUE,
                    ""ShowInFooter""        BOOLEAN       NOT NULL DEFAULT FALSE,
                    ""FooterSection""       VARCHAR(50)   NULL,
                    ""SortOrder""           INTEGER       NOT NULL DEFAULT 0,
                    ""IsSystem""            BOOLEAN       NOT NULL DEFAULT FALSE,
                    ""CreatedAt""           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
                    ""UpdatedAt""           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
                    CONSTRAINT ""PK_StaticPages"" PRIMARY KEY (""Id"")
                );
            ");

            migrationBuilder.Sql(@"
                CREATE UNIQUE INDEX IF NOT EXISTS ""IX_StaticPages_Slug"" ON ""StaticPages"" (""Slug"");
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"DROP TABLE IF EXISTS ""StaticPages"";");
        }
    }
}
