const { DataTypes } = require("sequelize");
const connection = require("../database/database");

const Profile = connection.define("profiles", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

module.exports = Profile;
