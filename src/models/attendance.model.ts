import { DataTypes, type Sequelize } from 'sequelize'

export function initAttendanceModel(sequelize: Sequelize) {
  return sequelize.define(
    'Attendance',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      author_id: { type: DataTypes.INTEGER, allowNull: false },
      sitting_id: { type: DataTypes.INTEGER, allowNull: false },
      attended: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      tableName: 'api_attendance',
      timestamps: false,
      indexes: [{ unique: true, fields: ['author_id', 'sitting_id'] }],
    },
  )
}
