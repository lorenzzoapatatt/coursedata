const { DataTypes } = require("sequelize");
const connection = require("../database/database");

const Enterprise = connection.define("enterprises", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  cnpj: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  email: {
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
});

// Force creation on  the database
//Enterprise.sync({ force: true });

module.exports = Enterprise;
