const { DataTypes } = require("sequelize");
const connection = require("../database/database");
const Enterprise = require("../enterprises/Enterprise");
const Role = require("../models/Role");

const User = connection.define(
  "users",
  {
    enterprise_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "roles",
        key: "id",
      },
      comment: "Foreign key para a tabela de roles",
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING,
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

User.belongsTo(Enterprise, { foreignKey: "enterprise_id" });
User.belongsTo(Role, { foreignKey: "role_id" });

module.exports = User;
