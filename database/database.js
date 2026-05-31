const Sequelize = require("sequelize");

const connection = new Sequelize("coursedata", "root", "mysql", {
  host: "localhost",
  dialect: "mysql",
  port: 3306,
});

module.exports = connection;
