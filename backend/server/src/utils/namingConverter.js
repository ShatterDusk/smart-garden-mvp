/**
 * 命名转换工具函数
 * 用于数据库层与应用层之间的字段名转换
 * 
 * 注意：Model 层已通过 getterMethods 提供 camelCase 访问
 * 此模块主要用于特殊场景（如原始数据处理）
 */

/**
 * snake_case 转换为 camelCase
 * @param {string} str - snake_case 字符串
 * @returns {string} camelCase 字符串
 */
function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, function(match, letter) {
    return letter.toUpperCase();
  });
}

/**
 * camelCase 转换为 snake_case
 * @param {string} str - camelCase 字符串
 * @returns {string} snake_case 字符串
 */
function camelToSnake(str) {
  return str.replace(/([A-Z])/g, function(match, letter) {
    return '_' + letter.toLowerCase();
  }).replace(/^_/, '');
}

/**
 * 对象键名转换：snake_case -> camelCase
 * @param {Object} obj - 输入对象
 * @returns {Object} 转换后的对象
 */
function keysToCamel(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(function(item) {
      return keysToCamel(item);
    });
  }

  const result = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = snakeToCamel(key);
      const value = obj[key];

      if (typeof value === 'object' && value !== null) {
        result[camelKey] = keysToCamel(value);
      } else {
        result[camelKey] = value;
      }
    }
  }
  return result;
}

/**
 * 对象键名转换：camelCase -> snake_case
 * @param {Object} obj - 输入对象
 * @returns {Object} 转换后的对象
 */
function keysToSnake(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(function(item) {
      return keysToSnake(item);
    });
  }

  const result = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = camelToSnake(key);
      const value = obj[key];

      if (typeof value === 'object' && value !== null) {
        result[snakeKey] = keysToSnake(value);
      } else {
        result[snakeKey] = value;
      }
    }
  }
  return result;
}

module.exports = {
  keysToCamel,
  keysToSnake,
  snakeToCamel,
  camelToSnake,
};
