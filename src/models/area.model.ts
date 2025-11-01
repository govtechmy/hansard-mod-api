import { DataTypes, type Sequelize } from "sequelize";

export function initAreaModel(sequelize: Sequelize) {
  return sequelize.define(
    "Area",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.TEXT, allowNull: false },
      type: { type: DataTypes.STRING(8), allowNull: false },
      state: { type: DataTypes.TEXT, allowNull: false },
    },
    { tableName: "api_area", timestamps: false },
  );
}


