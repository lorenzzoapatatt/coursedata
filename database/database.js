const Sequelize = require("sequelize");

const connection = new Sequelize("postgres", "postgres", "Naometoque1371626", {
  host: "localhost",
  dialect: "postgres",
  port: 5432,
});

module.exports = connection;
