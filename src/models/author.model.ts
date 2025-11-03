import { DataTypes, type Sequelize } from 'sequelize'

export function initAuthorModel(sequelize: Sequelize) {
  return sequelize.define(
    'Author',
    {
      new_author_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.TEXT, allowNull: false },
      birth_year: { type: DataTypes.INTEGER, allowNull: true },
      ethnicity: { type: DataTypes.TEXT, allowNull: false },
      sex: { type: DataTypes.CHAR(1), allowNull: false },
    },
    { tableName: 'api_author', timestamps: false },
  )
}
