import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.addColumn("Campaigns", "tagId", {
      type: DataTypes.INTEGER,
      allowNull: true
    });
  },
  down: (queryInterface: QueryInterface) => {
    return queryInterface.removeColumn("Campaigns", "tagId");
  }
};
