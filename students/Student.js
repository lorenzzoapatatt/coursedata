const { DataTypes } = require("sequelize");
const connection = require("../database/database");
const User = require("../users/User");

const Student = connection.define(
  "students",
  {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);

Student.belongsTo(User, { foreignKey: "user_id" });
User.hasOne(Student, { foreignKey: "user_id" });

module.exports = Student;
