const { DataTypes } = require("sequelize");
const connection = require("../database/database");
const User = require("../users/User");

const Professor = connection.define(
  "professors",
  {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);

Professor.belongsTo(User, { foreignKey: "user_id" });
User.hasOne(Professor, { foreignKey: "user_id" });

module.exports = Professor;
