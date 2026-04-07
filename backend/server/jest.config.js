module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.js'],
  transform: {
    '^.+\.js$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(uuid)/)',
  ],
  testTimeout: 30000,
  verbose: true,
  testPathIgnorePatterns: [
    '/node_modules/',
  ],
  // 串行运行所有项目，避免数据库连接冲突
  maxWorkers: 1,
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.js'],
      transform: {
        '^.+\\.js$': 'babel-jest',
      },
      transformIgnorePatterns: [
        'node_modules/(?!(uuid)/)',
      ],
      testTimeout: 30000,
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.js'],
      globalSetup: '<rootDir>/tests/setup/globalSetup.js',
      globalTeardown: '<rootDir>/tests/setup/globalTeardown.js',
      transform: {
        '^.+\.js$': 'babel-jest',
      },
      transformIgnorePatterns: [
        'node_modules/(?!(uuid)/)',
      ],
      testTimeout: 30000,
      maxWorkers: 1,
    },
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/tests/e2e/**/*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.js'],
      globalSetup: '<rootDir>/tests/setup/globalSetup.js',
      globalTeardown: '<rootDir>/tests/setup/globalTeardown.js',
      transform: {
        '^.+\.js$': 'babel-jest',
      },
      transformIgnorePatterns: [
        'node_modules/(?!(uuid)/)',
      ],
      testTimeout: 60000,
      maxWorkers: 1,
    },
  ],
};
