import { DataTypes, type Sequelize } from 'sequelize'

export function initParliamentaryCycleModel(sequelize: Sequelize) {
  return sequelize.define(
    'ParliamentaryCycle',
    {
      cycle_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      start_date: { type: DataTypes.DATEONLY, allowNull: false },
      end_date: { type: DataTypes.DATEONLY, allowNull: false },
      house: { type: DataTypes.INTEGER, allowNull: false },
      term: { type: DataTypes.INTEGER, allowNull: false },
      session: { type: DataTypes.INTEGER, allowNull: false },
      meeting: { type: DataTypes.INTEGER, allowNull: false },
    },
    { tableName: 'api_parliamentary_cycle', timestamps: false },
  )
}
