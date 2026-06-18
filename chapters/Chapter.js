const { DataTypes } = require("sequelize");
const connection = require("../database/database");
const Course = require("../courses/Course");

const Chapter = connection.define(
  "chapters",
  {
    course_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT("long"),
      allowNull: false,
    },
    video_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    video_provider: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "mux",
    },
    mux_upload_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    mux_upload_status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    mux_asset_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    mux_playback_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    duration_seconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    mux_error: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    is_free_preview: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "draft",
    },
  },
  {
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);

Chapter.belongsTo(Course, { foreignKey: "course_id", as: "course" });
Course.hasMany(Chapter, { foreignKey: "course_id", as: "chapters" });

module.exports = Chapter;
