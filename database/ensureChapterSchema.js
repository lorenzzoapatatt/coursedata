const { DataTypes } = require("sequelize");
const connection = require("./database");

const hasColumn = (table, column) => Boolean(table[column]);

const addMissingColumn = (queryInterface, table, column, definition) =>
  hasColumn(table, column)
    ? Promise.resolve()
    : queryInterface.addColumn("chapters", column, definition);

const changeColumnIfExists = (queryInterface, table, column, definition) =>
  hasColumn(table, column)
    ? queryInterface.changeColumn("chapters", column, definition)
    : Promise.resolve();

const ensureChapterSchema = async () => {
  const queryInterface = connection.getQueryInterface();
  const chapterTable = await queryInterface.describeTable("chapters");

  await addMissingColumn(queryInterface, chapterTable, "mux_upload_id", {
    type: DataTypes.STRING,
    allowNull: true,
  });

  await addMissingColumn(queryInterface, chapterTable, "mux_upload_status", {
    type: DataTypes.STRING,
    allowNull: true,
  });

  await addMissingColumn(queryInterface, chapterTable, "mux_error", {
    type: DataTypes.TEXT,
    allowNull: true,
  });

  await changeColumnIfExists(queryInterface, chapterTable, "video_provider", {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "mux",
  });

  await connection.query(`
    UPDATE chapters
    SET
      video_provider = 'mux'
    WHERE video_provider IS NULL OR video_provider = '' OR video_provider = 'external_url'
  `);
};

module.exports = ensureChapterSchema;
