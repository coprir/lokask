/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    'config/env': '<rootDir>/src/__tests__/__mocks__/env.ts',
    'config/supabase': '<rootDir>/src/__tests__/__mocks__/supabase.ts',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/__tests__/**',
    '!src/index.ts',
  ],
  coverageThreshold: {
    global: {
      lines: 60,
    },
  },
};
