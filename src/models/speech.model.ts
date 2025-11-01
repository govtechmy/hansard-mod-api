import { DataTypes, type Sequelize } from "sequelize";

export function initSpeechModel(sequelize: Sequelize) {
  return sequelize.define(
    "Speech",
    {
      speech_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      sitting_id: { type: DataTypes.INTEGER, allowNull: true },
      index: { type: DataTypes.INTEGER, allowNull: false },
      speaker_id: { type: DataTypes.INTEGER, allowNull: true },
      timestamp: { type: DataTypes.STRING(10), allowNull: false },
      speech: { type: DataTypes.TEXT, allowNull: true },
      // Declare as TSVECTOR for parity with Django; actual DB change via migration later
      speech_vector: { type: "TSVECTOR" as unknown as any, allowNull: true },
      speech_tokens: { type: DataTypes.ARRAY(DataTypes.TEXT), allowNull: false, defaultValue: [] },
      length: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      level_1: { type: DataTypes.TEXT, allowNull: true },
      level_2: { type: DataTypes.TEXT, allowNull: true },
      level_3: { type: DataTypes.TEXT, allowNull: true },
      is_annotation: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    {
      tableName: "api_speech",
      timestamps: false,
      indexes: [
        { unique: true, fields: ["sitting_id", "index"] },
        { fields: ["speech_vector"], using: "GIN" },
      ],
    },
  );
}


