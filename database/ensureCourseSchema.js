const { DataTypes } = require("sequelize");
const connection = require("./database");

const hasColumn = (table, column) => Boolean(table[column]);

const addMissingColumn = (queryInterface, table, column, definition) =>
  hasColumn(table, column)
    ? Promise.resolve()
    : queryInterface.addColumn("courses", column, definition);

const changeColumnIfExists = (queryInterface, table, column, definition) =>
  hasColumn(table, column)
    ? queryInterface.changeColumn("courses", column, definition)
    : Promise.resolve();

const ensureCourseSchema = async () => {
  const queryInterface = connection.getQueryInterface();
  const courseTable = await queryInterface.describeTable("courses");

  await changeColumnIfExists(queryInterface, courseTable, "enterprise_id", {
    type: DataTypes.INTEGER,
    allowNull: true,
  });

  await changeColumnIfExists(queryInterface, courseTable, "professor_id", {
    type: DataTypes.INTEGER,
    allowNull: true,
  });

  await addMissingColumn(queryInterface, courseTable, "title", {
    type: DataTypes.STRING,
    allowNull: true,
  });

  await changeColumnIfExists(queryInterface, courseTable, "name", {
    type: DataTypes.STRING,
    allowNull: true,
  });

  await changeColumnIfExists(queryInterface, courseTable, "description", {
    type: DataTypes.TEXT("long"),
    allowNull: false,
  });

  await addMissingColumn(queryInterface, courseTable, "workload_hours", {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  });

  await changeColumnIfExists(queryInterface, courseTable, "workload", {
    type: DataTypes.INTEGER,
    allowNull: true,
  });

  await addMissingColumn(queryInterface, courseTable, "image", {
    type: DataTypes.TEXT("long"),
    allowNull: true,
  });

  await addMissingColumn(queryInterface, courseTable, "chapter_id", {
    type: DataTypes.INTEGER,
    allowNull: true,
  });

  await changeColumnIfExists(queryInterface, courseTable, "price", {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  });

  await changeColumnIfExists(queryInterface, courseTable, "status", {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "draft",
  });

  await addMissingColumn(queryInterface, courseTable, "slug", {
    type: DataTypes.STRING,
    allowNull: true,
  });

  await addMissingColumn(queryInterface, courseTable, "attachments", {
    type: DataTypes.TEXT("long"),
    allowNull: true,
  });

  await addMissingColumn(queryInterface, courseTable, "created_at", {
    type: DataTypes.DATE,
    allowNull: true,
  });

  await addMissingColumn(queryInterface, courseTable, "updated_at", {
    type: DataTypes.DATE,
    allowNull: true,
  });

  await changeColumnIfExists(queryInterface, courseTable, "createdAt", {
    type: DataTypes.DATE,
    allowNull: true,
  });

  await changeColumnIfExists(queryInterface, courseTable, "updatedAt", {
    type: DataTypes.DATE,
    allowNull: true,
  });

  const createdAtFallback = hasColumn(courseTable, "createdAt") ? "createdAt" : "NOW()";
  const updatedAtFallback = hasColumn(courseTable, "updatedAt") ? "updatedAt" : "NOW()";

  await connection.query(`
    UPDATE courses
    SET
      title = COALESCE(NULLIF(title, ''), NULLIF(name, ''), CONCAT('Course ', id)),
      description = COALESCE(description, ''),
      workload_hours = COALESCE(NULLIF(workload_hours, 0), workload, 0),
      name = COALESCE(NULLIF(name, ''), NULLIF(title, ''), CONCAT('Course ', id)),
      workload = COALESCE(workload, workload_hours, 0),
      status = CASE
        WHEN status IN ('1', 'true', 'active', 'published') THEN 'published'
        WHEN status IN ('0', 'false', 'inactive', 'unpublished') THEN 'draft'
        WHEN status IS NULL OR status = '' THEN 'draft'
        ELSE status
      END,
      created_at = COALESCE(created_at, ${createdAtFallback}),
      updated_at = COALESCE(updated_at, ${updatedAtFallback})
  `);

  await changeColumnIfExists(queryInterface, await queryInterface.describeTable("courses"), "title", {
    type: DataTypes.STRING,
    allowNull: false,
  });
};

module.exports = ensureCourseSchema;
