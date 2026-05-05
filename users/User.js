const { DataTypes } = require("sequelize");
const connection = require("../database/database");
const Enterprise = require("../enterprises/Enterprise");
const Profile = require("../profiles/Profile");

const User = connection.define("users", {
  enterprise_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  profile_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
});

User.belongsTo(Enterprise, { foreignKey: "enterprise_id" });
User.belongsTo(Profile, { foreignKey: "profile_id" });

module.exports = User;
