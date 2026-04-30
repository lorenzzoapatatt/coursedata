const Sequelize = require("sequelize");

const connection = new Sequelize("coursedata", "root", "senac123", {
  host: "localhost",
  dialect: "mysql",
  port: 3307,
});

module.exports = connection;
