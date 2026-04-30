const { DataTypes } = require("sequelize");
const connection = require("../database/database");

const Course = connection.define("courses", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  workload: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
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

// Force creation on  the database
//Course.sync({ force: true });

module.exports = Course;
