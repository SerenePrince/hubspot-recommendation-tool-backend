/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.js"],
  clearMocks: true,
  resetMocks: false,
  restoreMocks: true,

  verbose: false,

  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],

  collectCoverageFrom: [
    "src/**/*.js",
    "!src/**/__mocks__/**",
    "!src/**/index.js",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],

  coverageThreshold: {
    global: {
      statements: 70,
      branches: 60,
      functions: 70,
      lines: 70,
    },
  },
};
