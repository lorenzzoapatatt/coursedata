const { DataTypes } = require("sequelize");
const connection = require("../database/database");
const Role = require("./Role");
const Permission = require("./Permission");

const RolePermission = connection.define(
  "role_permissions",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "roles",
        key: "id",
      },
    },
    permission_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "permissions",
        key: "id",
      },
    },
  },
  {
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);

RolePermission.belongsTo(Role, { foreignKey: "role_id" });
RolePermission.belongsTo(Permission, { foreignKey: "permission_id" });

Role.hasMany(RolePermission, { foreignKey: "role_id" });
Permission.hasMany(RolePermission, { foreignKey: "permission_id" });

module.exports = RolePermission;
