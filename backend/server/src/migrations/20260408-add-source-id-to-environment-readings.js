module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      'environment_readings',
      'source_id',
      {
        type: Sequelize.STRING(64),
        allowNull: true,
        comment: '来源标识（设备ID/城市代码/经纬度）',
        after: 'is_stale',
      }
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('environment_readings', 'source_id');
  },
};
