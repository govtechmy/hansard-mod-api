import { DataTypes, type Sequelize } from 'sequelize'

export function initSittingModel(sequelize: Sequelize) {
  return sequelize.define(
    'Sitting',
    {
      sitting_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      cycle_id: { type: DataTypes.INTEGER, allowNull: false },
      date: { type: DataTypes.DATEONLY, allowNull: false },
      filename: { type: DataTypes.STRING(255), allowNull: false, unique: true },
      has_dataset: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      is_final: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      speech_data: { type: DataTypes.TEXT, allowNull: false, defaultValue: '[]' },
      summary_status: {type: DataTypes.STRING, allowNull: false, defaultValue: 'pending'},
    },
    { tableName: 'api_sitting', timestamps: false },
  )
}
