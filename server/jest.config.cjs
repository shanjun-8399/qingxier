module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: 'test/.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts'],
  coverageDirectory: '../reports/node-server-coverage',
  coverageReporters: ['text', 'lcov', 'cobertura'],
  coverageThreshold: {
    global: { branches: 70, functions: 75, lines: 80, statements: 80 }
  },
  testEnvironment: 'node'
};
