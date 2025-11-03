import { DataTypes, type Sequelize } from 'sequelize'

export function initAuthorHistoryModel(sequelize: Sequelize) {
  return sequelize.define(
    'AuthorHistory',
    {
      record_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      author_id: { type: DataTypes.INTEGER, allowNull: false },
      party: { type: DataTypes.STRING(32), allowNull: true },
      area_id: { type: DataTypes.INTEGER, allowNull: true },
      exec_posts: { type: DataTypes.TEXT, allowNull: true },
      service_posts: { type: DataTypes.TEXT, allowNull: true },
      start_date: { type: DataTypes.DATEONLY, allowNull: false },
      end_date: { type: DataTypes.DATEONLY, allowNull: true },
    },
    { tableName: 'api_author_history', timestamps: false },
  )
}
