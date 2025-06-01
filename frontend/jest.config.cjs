/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // CSS modules proxy (if you were using CSS modules)
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  testMatch: [
    '**/__tests__/**/*.ts?(x)',
    '**/?(*.)+(spec|test).ts?(x)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { 
        tsconfig: {
          // Manually listing essential compilerOptions to avoid require('./tsconfig.json') issues
          "target": "ESNext",
          "lib": ["DOM", "DOM.Iterable", "ESNext"],
          "module": "ESNext", // Crucial for import.meta
          "skipLibCheck": true,
          "jsx": "react-jsx",
          "strict": true,
          "esModuleInterop": true,
          "allowSyntheticDefaultImports": true,
          "forceConsistentCasingInFileNames": true, 
          "moduleResolution": "bundler",
          "allowImportingTsExtensions": true,
          "resolveJsonModule": true,
          "isolatedModules": true,
          "noEmit": true,
          "noUnusedLocals": true, // Preserving linting-related options
          "noUnusedParameters": true,
          "noFallthroughCasesInSwitch": true,
          "baseUrl": ".", // For path aliases
          "paths": {
            "@/*": ["src/*"]
          }
        },
        astTransformers: {
          before: [
            {
              path: 'ts-jest-mock-import-meta',
              options: { metaObjectReplacement: { env: { VITE_BRANCH: 'test-branch-from-jest' } } }
            }
          ]
        },
        diagnostics: {
          ignoreCodes: ['1343'] // Ignore TS1343: 'import.meta' property is only allowed when the '--module' option is 'es2020'...
        }
    }]
  },
}; 