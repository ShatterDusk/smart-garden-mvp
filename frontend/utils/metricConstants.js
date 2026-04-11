/**
 * 环境指标常量定义
 * 天气状况、风向等枚举型指标的映射表
 */

// 和风天气代码 → { text, icon } 映射表
var weatherCodeMap = {
  // 晴天
  '100': { text: '晴', icon: '☀️' },
  '150': { text: '晴', icon: '🌤' },
  '153': { text: '晴', icon: '🌤' },

  // 多云
  '101': { text: '多云', icon: '⛅' },
  '102': { text: '少云', icon: '⛅' },
  '103': { text: '晴间多云', icon: '⛅' },

  // 阴天
  '104': { text: '阴', icon: '☁️' },
  '105': { text: '阴', icon: '☁️' },

  // 小雨
  '300': { text: '阵雨', icon: '🌦' },
  '301': { text: '强阵雨', icon: '🌧' },
  '302': { text: '雷阵雨', icon: '⛈' },
  '303': { text: '强雷阵雨', icon: '⛈' },

  // 小雨
  '304': { text: '小雨', icon: '🌦' },
  '305': { text: '雨', icon: '🌧' },
  '306': { text: '中雨', icon: '🌧' },

  // 大雨
  '307': { text: '大雨', icon: '🌧' },
  '308': { text: '极端降雨', icon: '🌧' },
  '309': { text: '豪雨', icon: '🌧' },
  '310': { text: '大豪雨', icon: '🌧' },

  // 暴雨
  '311': { text: '特大暴雨', icon: '🌧' },
  '312': { text: '极端降雨', icon: '🌧' },
  '313': { text: '特大暴雨', icon: '🌧' },

  // 冻雨
  '314': { text: '冻雨', icon: '🌨' },
  '315': { text: '小冻雨', icon: '🌨' },
  '316': { text: '中冻雨', icon: '🌨' },
  '317': { text: '大冻雨', icon: '🌨' },
  '318': { text: '超大冻雨', icon: '🌨' },

  // 小雪
  '400': { text: '小雪', icon: '🌨' },
  '401': { text: '雪', icon: '❄️' },
  '402': { text: '中雪', icon: '❄️' },

  // 大雪
  '403': { text: '大雪', icon: '❄️' },
  '404': { text: '暴雪', icon: '❄️' },
  '405': { text: '大暴雪', icon: '❄️' },
  '406': { text: '特大暴雪', icon: '❄️' },

  // 阵雪
  '407': { text: '阵雪', icon: '🌨' },
  '408': { text: '大阵雪', icon: '❄️' },
  '409': { text: '特大阵雪', icon: '❄️' },
  '410': { text: '短时阵雪', icon: '🌨' },

  // 其他天气现象
  '399': { text: '雨夹雪', icon: '🌨' },

  // 浮尘
  '500': { text: '薄雾', icon: '🌫' },
  '501': { text: '雾', icon: '🌫' },
  '502': { text: '霾', icon: '😷' },
  '503': { text: '扬沙', icon: '🌪' },
  '504': { text: '浮尘', icon: '🌪' },
  '507': { text: '沙尘暴', icon: '🌪' },
  '508': { text: '强沙尘暴', icon: '🌪' },
  '509': { text: '浓雾', icon: '🌫' },
  '510': { text: '强浓雾', icon: '🌫' },
  '511': { text: '中度霾', icon: '😷' },
  '512': { text: '重度霾', icon: '😷' },
  '513': { text: '严重霾', icon: '😷' },
  '514': { text: '大雾', icon: '🌫' },
  '515': { text: '特强浓雾', icon: '🌫' }
};

// 风向角度 → 方位文字 映射
var windDirectionMap = {
  '0': { text: '北风', abbr: 'N' },
  '22': { text: '东北风', abbr: 'NE' },
  '45': { text: '东北风', abbr: 'NE' },
  '67': { text: '东风', abbr: 'E' },
  '90': { text: '东风', abbr: 'E' },
  '112': { text: '东南风', abbr: 'SE' },
  '135': { text: '东南风', abbr: 'SE' },
  '157': { text: '南风', abbr: 'S' },
  '180': { text: '南风', abbr: 'S' },
  '202': { text: '西南风', abbr: 'SW' },
  '225': { text: '西南风', abbr: 'SW' },
  '247': { text: '西风', abbr: 'W' },
  '270': { text: '西风', abbr: 'W' },
  '292': { text: '西北风', abbr: 'NW' },
  '315': { text: '西北风', abbr: 'NW' },
  '337': { text: '北风', abbr: 'N' },
  '360': { text: '北风', abbr: 'N' }
};

// 风力等级 → 描述 映射
var windScaleMap = {
  '0': { text: '无风', desc: '0km/h' },
  '1': { text: '软风', desc: '1-5km/h' },
  '2': { text: '轻风', desc: '6-11km/h' },
  '3': { text: '微风', desc: '12-19km/h' },
  '4': { text: '和风', desc: '20-28km/h' },
  '5': { text: '清风', desc: '29-38km/h' },
  '6': { text: '强风', desc: '39-49km/h' },
  '7': { text: '疾风', desc: '50-61km/h' },
  '8': { text: '大风', desc: '62-74km/h' },
  '9': { text: '烈风', desc: '75-88km/h' },
  '10': { text: '狂风', desc: '89-102km/h' },
  '11': { text: '暴风', desc: '103-117km/h' },
  '12': { text: '飓风', desc: '>117km/h' }
};

/**
 * 根据天气代码获取天气信息
 * @param {string|number} code - 天气代码（如 100, 501）
 * @returns {{ text: string, icon: string }} 天气描述对象
 */
function getWeatherInfo(code) {
  var codeStr = String(code);
  if (weatherCodeMap[codeStr]) {
    return weatherCodeMap[codeStr];
  }
  return { text: '未知', icon: '❓' };
}

/**
 * 根据风向角度获取风向信息
 * @param {number} angle - 角度（0-360）
 * @returns {{ text: string, abbr: string }} 风向描述对象
 */
function getWindDirection(angle) {
  if (angle === null || angle === undefined || isNaN(angle)) {
    return { text: '-', abbr: '-' };
  }

  var numAngle = Number(angle);

  // 找最近的方向
  var directions = Object.keys(windDirectionMap).map(Number);
  var closest = directions.reduce(function(prev, curr) {
    return Math.abs(curr - numAngle) < Math.abs(prev - numAngle) ? curr : prev;
  });

  return windDirectionMap[String(closest)] || { text: '未知', abbr: '?' };
}

/**
 * 根据风力等级获取风力描述
 * @param {number} scale - 风力等级（0-12）
 * @returns {{ text: string, desc: string }} 风力描述对象
 */
function getWindScale(scale) {
  var scaleStr = String(scale);
  if (windScaleMap[scaleStr]) {
    return windScaleMap[scaleStr];
  }
  return { text: '未知', desc: '' };
}

module.exports = {
  weatherCodeMap,
  windDirectionMap,
  windScaleMap,
  getWeatherInfo,
  getWindDirection,
  getWindScale
};
