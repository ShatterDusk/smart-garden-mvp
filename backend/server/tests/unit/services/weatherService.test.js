/**
 * weatherService 单元测试
 * 覆盖率目标：85%+
 */

// 在加载模块前设置环境变量
process.env.WEATHER_API_KEY = 'test_api_key'
process.env.WEATHER_BASE_URL = 'https://devapi.qweather.com/v7'

jest.mock('axios')
jest.mock('../../../src/utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  info: jest.fn()
}))

const axios = require('axios')
const logger = require('../../../src/utils/logger')
const {
  getCurrentWeather,
  getAstronomyData,
  convertToMetrics,
  getWeatherForPlant
} = require('../../../src/services/weatherService')

describe('weatherService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getCurrentWeather', () => {
    it('应该成功获取当前天气（使用城市编码）', async () => {
      const mockResponse = {
        data: {
          code: '200',
          now: {
            temp: '25',
            humidity: '60',
            text: '晴',
            icon: '100',
            windSpeed: '10',
            windDir: '东南风',
            pressure: '1013',
            vis: '10'
          }
        }
      }
      axios.get.mockResolvedValue(mockResponse)

      const result = await getCurrentWeather('101010100')

      expect(axios.get).toHaveBeenCalledWith(
        'https://devapi.qweather.com/v7/weather/now',
        expect.objectContaining({
          params: expect.objectContaining({
            location: '101010100'
          }),
          timeout: 10000
        })
      )
      expect(result).toMatchObject({
        temperature: 25,
        humidity: 60,
        weatherCondition: '晴',
        weatherCode: 100,
        windSpeed: 10,
        windDirection: '东南风',
        pressure: 1013,
        visibility: 10,
        dataSource: 'weather_api'
      })
    })

    it('应该成功获取当前天气（使用经纬度）', async () => {
      const mockResponse = {
        data: {
          code: '200',
          now: {
            temp: '28',
            humidity: '70',
            text: '多云',
            icon: '101',
            windSpeed: '5',
            windDir: '北风',
            pressure: '1010',
            vis: '8'
          }
        }
      }
      axios.get.mockResolvedValue(mockResponse)

      await getCurrentWeather('101010100', 39.9042, 116.4074)

      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            location: '116.4074,39.9042'
          })
        })
      )
    })

    it('应该返回null当API返回错误码', async () => {
      const mockResponse = {
        data: {
          code: '400',
          message: 'Invalid location'
        }
      }
      axios.get.mockResolvedValue(mockResponse)

      const result = await getCurrentWeather('invalid_code')

      expect(result).toBeNull()
      expect(logger.warn).toHaveBeenCalledWith('天气API返回错误', expect.any(Object))
    })

    it('应该返回null当API请求失败', async () => {
      axios.get.mockRejectedValue(new Error('Network error'))

      const result = await getCurrentWeather('101010100')

      expect(result).toBeNull()
      expect(logger.error).toHaveBeenCalledWith('获取天气数据失败', expect.any(Object))
    })

    it('应该处理超时错误', async () => {
      axios.get.mockRejectedValue(new Error('timeout of 10000ms exceeded'))

      const result = await getCurrentWeather('101010100')

      expect(result).toBeNull()
    })
  })

  describe('getAstronomyData', () => {
    it('应该成功获取天文数据', async () => {
      const mockResponse = {
        data: {
          code: '200',
          sun: {
            sunrise: '06:30',
            sunset: '18:45'
          }
        }
      }
      axios.get.mockResolvedValue(mockResponse)

      const result = await getAstronomyData('101010100')

      expect(result).toMatchObject({
        sunrise: '06:30',
        sunset: '18:45',
        sunHours: expect.any(Number)
      })
    })

    it('应该正确计算日照时长', async () => {
      const mockResponse = {
        data: {
          code: '200',
          sun: {
            sunrise: '06:00',
            sunset: '18:00'
          }
        }
      }
      axios.get.mockResolvedValue(mockResponse)

      const result = await getAstronomyData('101010100')

      expect(result.sunHours).toBe(12)
    })

    it('应该支持指定日期', async () => {
      const mockResponse = {
        data: {
          code: '200',
          sun: {
            sunrise: '06:15',
            sunset: '18:30'
          }
        }
      }
      axios.get.mockResolvedValue(mockResponse)

      await getAstronomyData('101010100', null, null, '2024-06-21')

      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            date: '2024-06-21'
          })
        })
      )
    })

    it('应该使用经纬度查询', async () => {
      const mockResponse = {
        data: {
          code: '200',
          sun: {
            sunrise: '06:00',
            sunset: '18:00'
          }
        }
      }
      axios.get.mockResolvedValue(mockResponse)

      await getAstronomyData('101010100', 39.9042, 116.4074)

      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            location: '116.4074,39.9042'
          })
        })
      )
    })

    it('应该返回null当API返回错误', async () => {
      const mockResponse = {
        data: {
          code: '400'
        }
      }
      axios.get.mockResolvedValue(mockResponse)

      const result = await getAstronomyData('invalid')

      expect(result).toBeNull()
      expect(logger.warn).toHaveBeenCalledWith('天文API返回错误', expect.any(Object))
    })

    it('应该返回null当请求失败', async () => {
      axios.get.mockRejectedValue(new Error('Network error'))

      const result = await getAstronomyData('101010100')

      expect(result).toBeNull()
      expect(logger.error).toHaveBeenCalledWith('获取天文数据失败', expect.any(Object))
    })

    it('应该处理日出日落为空的情况', async () => {
      const mockResponse = {
        data: {
          code: '200',
          sun: {
            sunrise: null,
            sunset: null
          }
        }
      }
      axios.get.mockResolvedValue(mockResponse)

      const result = await getAstronomyData('101010100')

      expect(result).toMatchObject({
        sunrise: null,
        sunset: null,
        sunHours: null
      })
    })
  })

  describe('convertToMetrics', () => {
    it('应该转换天气数据为指标', () => {
      const weatherData = {
        temperature: 25,
        humidity: 60,
        windSpeed: 10,
        pressure: 1013,
        weatherCode: 100
      }

      const result = convertToMetrics(weatherData)

      expect(result).toEqual({
        temperature: 25,
        humidity: 60,
        wind_speed: 10,
        air_pressure: 1013,
        weather_condition: 100
      })
    })

    it('应该包含天文数据', () => {
      const weatherData = {
        temperature: 25,
        humidity: 60
      }
      const astroData = {
        sunrise: '06:00',
        sunset: '18:00',
        sunHours: 12
      }

      const result = convertToMetrics(weatherData, astroData)

      expect(result).toHaveProperty('sun_hours', 12)
    })

    it('应该返回空对象当天气数据为null', () => {
      const result = convertToMetrics(null)
      expect(result).toEqual({})
    })

    it('应该返回空对象当天气数据为空对象', () => {
      const result = convertToMetrics({})
      expect(result).toEqual({})
    })

    it('应该处理部分数据缺失', () => {
      const weatherData = {
        temperature: 25
      }

      const result = convertToMetrics(weatherData)

      expect(result).toEqual({ temperature: 25 })
      expect(result).not.toHaveProperty('humidity')
    })
  })

  describe('getWeatherForPlant', () => {
    it('应该成功获取植物的天气数据', async () => {
      const mockWeatherResponse = {
        data: {
          code: '200',
          now: {
            temp: '25',
            humidity: '60',
            text: '晴',
            icon: '100',
            windSpeed: '10',
            windDir: '东南风',
            pressure: '1013',
            vis: '10'
          }
        }
      }
      const mockAstroResponse = {
        data: {
          code: '200',
          sun: {
            sunrise: '06:00',
            sunset: '18:00'
          }
        }
      }

      axios.get.mockResolvedValueOnce(mockWeatherResponse)
        .mockResolvedValueOnce(mockAstroResponse)

      const plant = {
        plant_id: 1,
        location_code: '101010100',
        location_lat: 39.9042,
        location_lng: 116.4074
      }

      const result = await getWeatherForPlant(plant)

      expect(result).toMatchObject({
        temperature: 25,
        humidity: 60,
        sun_hours: 12
      })
    })

    it('应该返回null当植物为null', async () => {
      const result = await getWeatherForPlant(null)
      expect(result).toBeNull()
    })

    it('应该返回null当植物没有位置信息', async () => {
      const plant = {
        plant_id: 1,
        location_code: null,
        location_lat: null,
        location_lng: null
      }

      const result = await getWeatherForPlant(plant)

      expect(result).toBeNull()
      expect(logger.debug).toHaveBeenCalledWith('植物未设置位置信息，无法获取天气', expect.any(Object))
    })

    it('应该使用城市编码当没有经纬度', async () => {
      const mockWeatherResponse = {
        data: {
          code: '200',
          now: {
            temp: '20',
            humidity: '50',
            text: '阴',
            icon: '104',
            windSpeed: '5',
            windDir: '北风',
            pressure: '1015',
            vis: '10'
          }
        }
      }
      const mockAstroResponse = {
        data: {
          code: '200',
          sun: {
            sunrise: '06:30',
            sunset: '18:30'
          }
        }
      }

      axios.get.mockResolvedValueOnce(mockWeatherResponse)
        .mockResolvedValueOnce(mockAstroResponse)

      const plant = {
        plant_id: 1,
        location_code: '101010100',
        location_lat: null,
        location_lng: null
      }

      await getWeatherForPlant(plant)

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('weather/now'),
        expect.objectContaining({
          params: expect.objectContaining({
            location: '101010100'
          })
        })
      )
    })

    it('应该处理天气API失败的情况', async () => {
      axios.get.mockRejectedValueOnce(new Error('Weather API error'))
      axios.get.mockResolvedValueOnce({
        data: {
          code: '200',
          sun: { sunrise: '06:00', sunset: '18:00' }
        }
      })

      const plant = {
        plant_id: 1,
        location_code: '101010100'
      }

      const result = await getWeatherForPlant(plant)

      // 天气API失败返回null，convertToMetrics(null, astroData) 返回空对象
      // 因为 convertToMetrics 在 weatherData 为 null 时直接返回 {}
      expect(result).toEqual({})
    })

    it('应该处理天文API失败的情况', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          code: '200',
          now: {
            temp: '25',
            humidity: '60',
            text: '晴',
            icon: '100',
            windSpeed: '10',
            windDir: '东南风',
            pressure: '1013',
            vis: '10'
          }
        }
      })
      axios.get.mockRejectedValueOnce(new Error('Astronomy API error'))

      const plant = {
        plant_id: 1,
        location_code: '101010100'
      }

      const result = await getWeatherForPlant(plant)

      expect(result).toHaveProperty('temperature', 25)
      expect(result).not.toHaveProperty('sun_hours')
    })

    it('应该处理两个API都失败的情况', async () => {
      axios.get.mockRejectedValue(new Error('API error'))

      const plant = {
        plant_id: 1,
        location_code: '101010100'
      }

      const result = await getWeatherForPlant(plant)

      expect(result).toEqual({})
    })
  })
})
