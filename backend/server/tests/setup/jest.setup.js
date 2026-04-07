jest.setTimeout(30000);

beforeAll(async () => {
});

afterAll(async () => {
});

expect.extend({
  toBeValidUserId(received) {
    const pass = typeof received === 'string' && received.startsWith('TEST_USER_');
    return {
      pass,
      message: () => `expected ${received} to be a valid test user ID`,
    };
  },
  toBeValidPlantId(received) {
    const pass = typeof received === 'string' && received.startsWith('TEST_PLANT_');
    return {
      pass,
      message: () => `expected ${received} to be a valid test plant ID`,
    };
  },
  toBeValidSessionId(received) {
    const pass = typeof received === 'string' && received.startsWith('TEST_SESSION_');
    return {
      pass,
      message: () => `expected ${received} to be a valid test session ID`,
    };
  },
});
