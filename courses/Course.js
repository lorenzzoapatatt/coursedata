const { DataTypes } = require("sequelize");
const connection = require("../database/database");
const Enterprise = require("../enterprises/Enterprise");
const Professor = require("../professors/Professor");

const Course = connection.define("courses", {
  enterprise_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  professor_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  workload: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  price: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  status: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
});

Course.belongsTo(Enterprise, { foreignKey: "enterprise_id" });
Course.belongsTo(Professor, { foreignKey: "professor_id" });
Enterprise.hasMany(Course, { foreignKey: "enterprise_id" });
Professor.hasMany(Course, { foreignKey: "professor_id" });

module.exports = Course;
