const { DataTypes } = require("sequelize");
const connection = require("../database/database");

const Class = connection.define("classes", {
  Course_id: {},
});
