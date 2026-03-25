using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Boioot.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSubscriptionHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── New lifecycle columns on Subscriptions ────────────────────────
            migrationBuilder.AddColumn<DateTime>(
                name: "TrialEndsAt",
                table: "Subscriptions",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CurrentPeriodStart",
                table: "Subscriptions",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CurrentPeriodEnd",
                table: "Subscriptions",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CanceledAt",
                table: "Subscriptions",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "EndedAt",
                table: "Subscriptions",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExternalProvider",
                table: "Subscriptions",
                type: "TEXT",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExternalSubscriptionId",
                table: "Subscriptions",
                type: "TEXT",
                maxLength: 200,
                nullable: true);

            // ── SubscriptionHistories table ───────────────────────────────────
            migrationBuilder.CreateTable(
                name: "SubscriptionHistories",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    SubscriptionId = table.Column<string>(type: "TEXT", nullable: false),
                    EventType = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    OldPlanId = table.Column<string>(type: "TEXT", nullable: true),
                    NewPlanId = table.Column<string>(type: "TEXT", nullable: true),
                    Notes = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SubscriptionHistories", x => x.Id);

                    table.ForeignKey(
                        name: "FK_SubscriptionHistories_Subscriptions_SubscriptionId",
                        column: x => x.SubscriptionId,
                        principalTable: "Subscriptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);

                    table.ForeignKey(
                        name: "FK_SubscriptionHistories_Plans_OldPlanId",
                        column: x => x.OldPlanId,
                        principalTable: "Plans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);

                    table.ForeignKey(
                        name: "FK_SubscriptionHistories_Plans_NewPlanId",
                        column: x => x.NewPlanId,
                        principalTable: "Plans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);

                    table.ForeignKey(
                        name: "FK_SubscriptionHistories_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SubscriptionHistories_SubscriptionId",
                table: "SubscriptionHistories",
                column: "SubscriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_SubscriptionHistories_CreatedAtUtc",
                table: "SubscriptionHistories",
                column: "CreatedAtUtc");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "SubscriptionHistories");

            migrationBuilder.DropColumn(name: "TrialEndsAt",             table: "Subscriptions");
            migrationBuilder.DropColumn(name: "CurrentPeriodStart",       table: "Subscriptions");
            migrationBuilder.DropColumn(name: "CurrentPeriodEnd",         table: "Subscriptions");
            migrationBuilder.DropColumn(name: "CanceledAt",               table: "Subscriptions");
            migrationBuilder.DropColumn(name: "EndedAt",                  table: "Subscriptions");
            migrationBuilder.DropColumn(name: "ExternalProvider",         table: "Subscriptions");
            migrationBuilder.DropColumn(name: "ExternalSubscriptionId",   table: "Subscriptions");
        }
    }
}
