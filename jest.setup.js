// Stub the native module so tests never reach requireNativeModule.
// Individual test files override './api' directly via jest.mock.
jest.mock('./src/DocuSignModule', () => ({
  __esModule: true,
  default: {},
}));
