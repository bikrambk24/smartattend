require('dotenv').config({ path: require('path').resolve(__dirname, '.env.test'), override: true });
console.log('JEST SETUP — DATABASE_URL:', process.env.DATABASE_URL);
console.log('JEST SETUP — JWT_SECRET:', process.env.JWT_SECRET);
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
};