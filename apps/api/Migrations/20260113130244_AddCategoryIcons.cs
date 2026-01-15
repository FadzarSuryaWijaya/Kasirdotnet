using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WarungKopiAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddCategoryIcons : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "IconCustom",
                table: "Categories",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IconPreset",
                table: "Categories",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IconCustom",
                table: "Categories");

            migrationBuilder.DropColumn(
                name: "IconPreset",
                table: "Categories");
        }
    }
}
