import { DataTypes, type Sequelize } from "sequelize";

export function initAttendanceModel(sequelize: Sequelize) {
  return sequelize.define(
    "Attendance",
    {
      author_id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
      sitting_id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
      attended: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: "api_attendance", timestamps: false },
  );
}


