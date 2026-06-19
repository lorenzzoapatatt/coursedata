require("dotenv").config({ quiet: true });

const Sequelize = require("sequelize");

const connection = new Sequelize(
  process.env.DB_NAME || "coursedata",
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD || "mysql",
  {
    host: process.env.DB_HOST || "localhost",
    dialect: process.env.DB_DIALECT || "mysql",
    port: Number(process.env.DB_PORT || 3306),
    logging: process.env.DB_LOGGING === "true" ? console.log : false,
  },
);

module.exports = connection;
