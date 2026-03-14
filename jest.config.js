module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/apps/backend-api'],
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '^@smart-dooh/shared-dto$': '<rootDir>/libs/shared/dto/src/index.ts',
    '^@smart-dooh/shared-dto/(.*)$': '<rootDir>/libs/shared/dto/src/$1',
    '^@smart-dooh/shared-geo$': '<rootDir>/libs/shared/geo/src/index.ts',
    '^@smart-dooh/shared-geo/(.*)$': '<rootDir>/libs/shared/geo/src/$1',
    '^@smart-dooh/shared-utils$': '<rootDir>/libs/shared/utils/src/index.ts',
    '^@smart-dooh/shared-utils/(.*)$': '<rootDir>/libs/shared/utils/src/$1',
    '^@smart-dooh/shared-sdk$': '<rootDir>/libs/shared/sdk/src/index.ts',
    '^@smart-dooh/shared-sdk/(.*)$': '<rootDir>/libs/shared/sdk/src/$1',
  },
  collectCoverageFrom: [
    'apps/backend-api/src/**/*.ts',
    '!apps/backend-api/src/**/*.interface.ts',
    '!apps/backend-api/src/**/*.dto.ts',
    '!apps/backend-api/src/**/main.ts',
  ],
  coverageDirectory: './coverage',
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  globals: {
    'ts-jest': {
      tsconfig: {
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        esModuleInterop: true,
      },
      diagnostics: false,
    },
  },
};
