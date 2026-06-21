const { DataTypes } = require("sequelize");
const connection = require("../database/database");
const Enterprise = require("../enterprises/Enterprise");
const Professor = require("../professors/Professor");

const Course = connection.define(
  "courses",
  {
    enterprise_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    professor_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // Legacy columns kept so old records and older admin forms continue to work.
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT("long"),
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "General",
    },
    workload_hours: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    workload: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    image: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },
    chapter_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "draft",
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    attachments: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },
  },
  {
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);

Course.belongsTo(Enterprise, { foreignKey: "enterprise_id" });
Course.belongsTo(Professor, { foreignKey: "professor_id" });
Enterprise.hasMany(Course, { foreignKey: "enterprise_id" });
Professor.hasMany(Course, { foreignKey: "professor_id" });

module.exports = Course;
