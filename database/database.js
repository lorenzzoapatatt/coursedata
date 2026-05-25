const Sequelize = require("sequelize");

const connection = new Sequelize("coursedata", "root", "mysql", {
  host: "localhost",
  dialect: "mysql",
  port: 3307,
});

module.exports = connection;
