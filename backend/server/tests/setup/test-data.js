const { v4: uuidv4 } = require('uuid');

function createTestUser(overrides = {}) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return {
    user_id: `TEST_USER_${timestamp}_${random}`,
    wx_openid: `test_openid_${timestamp}_${random}`,
    nickname: '测试用户',
    avatar_url: null,
    role: 'user',
    status: 'active',
    last_login_at: new Date(),
    ...overrides,
  };
}

function createTestPlant(userId, overrides = {}) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return {
    plant_id: `TEST_PLANT_${timestamp}_${random}`,
    user_id: userId,
    nickname: '测试植物',
    plant_category: 'succulent',
    species: '虎皮兰',
    cover_image_url: null,
    current_device_id: null,
    location_name: null,
    location_code: null,
    location_lat: null,
    location_lng: null,
    ...overrides,
  };
}

function createTestSession(userId, plantId = null, overrides = {}) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return {
    session_id: `TEST_SESSION_${timestamp}_${random}`,
    user_id: userId,
    type: plantId ? 'plant' : 'consultation',
    plant_id: plantId,
    title: plantId ? '植物会话' : '咨询会话',
    context_config: {
      environmentData: false,
      careRecords: false,
      historyDiagnosis: false,
    },
    status: 'active',
    ...overrides,
  };
}

function createTestDevice(userId, overrides = {}) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return {
    device_id: `TEST_DEVICE_${timestamp}_${random}`,
    user_id: userId,
    mac_address: `AA:BB:CC:DD:EE:${random.toUpperCase()}`,
    device_name: '测试设备',
    status: 'online',
    battery_level: 100,
    last_heartbeat: new Date(),
    ...overrides,
  };
}

function createTestMessage(sessionId, overrides = {}) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return {
    message_id: `TEST_MSG_${timestamp}_${random}`,
    session_id: sessionId,
    role: 'user',
    content_type: 'text',
    content: '测试消息内容',
    image_urls: null,
    status: 'normal',
    ...overrides,
  };
}

function createTestCareRecord(userId, plantId, overrides = {}) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return {
    record_id: `TEST_RECORD_${timestamp}_${random}`,
    user_id: userId,
    plant_id: plantId,
    action_type: 'water',
    description: '浇水',
    images: null,
    performed_at: new Date(),
    ...overrides,
  };
}

function createTestDiagnosisCard(plantId, messageId, overrides = {}) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return {
    diagnosis_card_id: `TEST_DIAG_${timestamp}_${random}`,
    plant_id: plantId,
    message_id: messageId,
    analysis_type: 'image',
    health_score: 85,
    status: 'healthy',
    issues: [],
    suggestions: [],
    confidence: 0.9,
    context_used: null,
    ...overrides,
  };
}

function createTestEnvironmentReading(plantId, overrides = {}) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return {
    reading_id: `TEST_READ_${timestamp}_${random}`,
    plant_id: plantId,
    data_source: 'sensor',
    recorded_at: new Date(),
    is_stale: false,
    ...overrides,
  };
}

function createTestEnvironmentReadingValue(readingId, metricCode, overrides = {}) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return {
    value_id: `TEST_VAL_${timestamp}_${random}`,
    reading_id: readingId,
    metric_code: metricCode,
    value: '25.0',
    ...overrides,
  };
}

function createTestUserConfig(userId, overrides = {}) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return {
    config_id: `TEST_CFG_${timestamp}_${random}`,
    user_id: userId,
    config_key: 'test_config',
    config_value: { test: true },
    config_type: 'preference',
    ...overrides,
  };
}

function createTestReadingTask(plantId, overrides = {}) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return {
    task_id: `TEST_TASK_${timestamp}_${random}`,
    plant_id: plantId,
    recorded_at: new Date(),
    sensor_status: 'pending',
    weather_status: 'pending',
    ...overrides,
  };
}

module.exports = {
  createTestUser,
  createTestPlant,
  createTestSession,
  createTestDevice,
  createTestMessage,
  createTestCareRecord,
  createTestDiagnosisCard,
  createTestEnvironmentReading,
  createTestEnvironmentReadingValue,
  createTestUserConfig,
  createTestReadingTask,
};
