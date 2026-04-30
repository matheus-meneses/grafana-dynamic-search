process.env.TZ = 'UTC';

const baseConfig = require('./.config/jest.config');

module.exports = {
  ...baseConfig,
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^@openfeature/(.*)$': '<rootDir>/src/__mocks__/@openfeature/stub.js',
  },
};
