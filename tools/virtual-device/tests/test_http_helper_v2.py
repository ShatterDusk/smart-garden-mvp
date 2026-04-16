"""
HTTPHelperV2 测试用例

测试场景：
1. 正常入队触发上报
2. 并发控制（正在上报时新数据入队）
3. 上报失败保留数据
4. 批量数据连续上报
"""

import unittest
import time
import os
import json
import tempfile
import shutil
from datetime import datetime
from unittest.mock import Mock, patch, MagicMock

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'app'))

from app.utils.http_helper_v2 import HTTPHelperV2


class TestHTTPHelperV2(unittest.TestCase):
    """HTTPHelperV2 测试类"""

    def setUp(self):
        """测试前准备"""
        # 创建临时目录用于队列持久化
        self.temp_dir = tempfile.mkdtemp()
        self.queue_path = os.path.join(self.temp_dir, 'queue.json')
        
        # 设置环境变量
        os.environ['HTTP_API_URL'] = 'http://localhost:3000/api/devices/data'
        os.environ['QUEUE_PERSIST_PATH'] = self.queue_path
        os.environ['LOCAL_QUEUE_SIZE'] = '10'
        os.environ['DEMO_MODE'] = 'false'
        
        self.helper = None

    def tearDown(self):
        """测试后清理"""
        if self.helper:
            self.helper.stop()
        # 清理临时目录
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_01_single_data_upload(self):
        """
        测试场景1：单条数据入队触发上报
        
        预期：
        - 数据成功入队
        - 触发上报流程
        - 上报成功后队列清空
        """
        print("\n[Test] 单条数据入队触发上报")
        
        # Mock requests.post 返回成功
        with patch('app.utils.http_helper_v2.requests.post') as mock_post:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = {'code': 0, 'message': 'success'}
            mock_post.return_value = mock_response
            
            # 创建 helper
            self.helper = HTTPHelperV2('http://localhost:3000/api/devices/data')
            
            # 发送数据
            timestamp = datetime(2026, 4, 10, 2, 0, 0)
            sensor_data = {
                'soil_moisture': 45.2,
                'temperature': 22.5
            }
            
            result = self.helper.send_multi_sensor_data(
                device_name='DEVICE_001',
                plant_id='PLANT_001',
                timestamp=timestamp,
                sensor_data_dict=sensor_data
            )
            
            # 验证入队成功
            self.assertTrue(result.success, "数据应该成功入队")
            
            # 等待上报完成（异步）
            time.sleep(0.5)
            
            # 验证上报被调用
            mock_post.assert_called_once()
            
            # 验证队列已空
            status = self.helper.get_queue_status()
            self.assertEqual(status['size'], 0, "上报成功后队列应该为空")
            
            print(f"  ✓ 数据入队成功: {result.message}")
            print(f"  ✓ 上报被调用: {mock_post.call_count} 次")
            print(f"  ✓ 队列状态: {status}")

    def test_02_concurrent_upload_control(self):
        """
        测试场景2：并发控制
        
        场景：
        - 第一条数据入队，触发上报（模拟长时间上报）
        - 第二条数据入队（正在上报中）
        
        预期：
        - 第二条数据只入队，不触发新上报循环
        - 第一条上报完成后，第二条被处理
        """
        print("\n[Test] 并发控制测试")
        
        with patch('app.utils.http_helper_v2.requests.post') as mock_post:
            # 模拟上报延迟
            def slow_post(*args, **kwargs):
                time.sleep(0.3)  # 模拟网络延迟
                mock_response = Mock()
                mock_response.status_code = 200
                mock_response.json.return_value = {'code': 0}
                return mock_response
            
            mock_post.side_effect = slow_post
            
            self.helper = HTTPHelperV2('http://localhost:3000/api/devices/data')
            
            # 第一条数据入队（触发上报）
            result1 = self.helper.send_multi_sensor_data(
                'DEVICE_001', 'PLANT_001',
                datetime(2026, 4, 10, 2, 0, 0),
                {'soil_moisture': 45.2}
            )
            
            time.sleep(0.1)  # 确保第一条开始上报
            
            # 检查正在上报中
            status = self.helper.get_queue_status()
            self.assertTrue(status['is_uploading'], "第一条数据应该触发上报")
            
            # 第二条数据入队（正在上报中）
            result2 = self.helper.send_multi_sensor_data(
                'DEVICE_001', 'PLANT_001',
                datetime(2026, 4, 10, 4, 0, 0),
                {'soil_moisture': 46.0}
            )
            
            # 等待所有上报完成
            time.sleep(1.0)
            
            # 验证两条数据都被上报
            self.assertEqual(mock_post.call_count, 2, "两条数据都应该被上报")
            
            # 验证队列已空
            status = self.helper.get_queue_status()
            self.assertEqual(status['size'], 0)
            
            print(f"  ✓ 第一条数据入队触发上报")
            print(f"  ✓ 第二条数据入队（正在上报中，只入队不触发新循环）")
            print(f"  ✓ 上报调用次数: {mock_post.call_count}")

    def test_03_upload_failure_keep_data(self):
        """
        测试场景3：上报失败保留数据
        
        场景：
        - 数据入队触发上报
        - 网络失败（连接错误）
        
        预期：
        - 数据保留在队列中
        - 下次入队时继续尝试上报
        """
        print("\n[Test] 上报失败保留数据")
        
        with patch('app.utils.http_helper_v2.requests.post') as mock_post:
            # 第一次调用失败，第二次成功
            call_count = [0]
            def fail_then_success(*args, **kwargs):
                call_count[0] += 1
                if call_count[0] == 1:
                    raise Exception("Connection refused")
                mock_response = Mock()
                mock_response.status_code = 200
                mock_response.json.return_value = {'code': 0}
                return mock_response
            
            mock_post.side_effect = fail_then_success
            
            self.helper = HTTPHelperV2('http://localhost:3000/api/devices/data')
            
            # 第一次入队（上报失败）
            result1 = self.helper.send_multi_sensor_data(
                'DEVICE_001', 'PLANT_001',
                datetime(2026, 4, 10, 2, 0, 0),
                {'soil_moisture': 45.2}
            )
            
            time.sleep(0.3)
            
            # 验证数据保留在队列
            status = self.helper.get_queue_status()
            self.assertEqual(status['size'], 1, "失败数据应该保留在队列")
            
            # 第二次入队（触发重新上报）
            result2 = self.helper.send_multi_sensor_data(
                'DEVICE_001', 'PLANT_001',
                datetime(2026, 4, 10, 4, 0, 0),
                {'soil_moisture': 46.0}
            )
            
            time.sleep(0.5)
            
            # 验证两条数据都被上报（第二次尝试成功）
            self.assertEqual(mock_post.call_count, 3, "应该有3次调用：第一次失败，第二次重试第一条，第三次上报第二条")
            
            print(f"  ✓ 第一次上报失败，数据保留")
            print(f"  ✓ 第二次入队触发重试")
            print(f"  ✓ 总上报调用次数: {mock_post.call_count}")

    def test_04_batch_upload(self):
        """
        测试场景4：批量数据连续上报
        
        场景：
        - 快速入队3条数据
        
        预期：
        - 第一条触发上报
        - 上报循环处理完所有数据才停止
        """
        print("\n[Test] 批量数据连续上报")
        
        with patch('app.utils.http_helper_v2.requests.post') as mock_post:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = {'code': 0}
            mock_post.return_value = mock_response
            
            self.helper = HTTPHelperV2('http://localhost:3000/api/devices/data')
            
            # 快速入队3条数据
            for i in range(3):
                self.helper.send_multi_sensor_data(
                    'DEVICE_001', 'PLANT_001',
                    datetime(2026, 4, 10, 2 + i*2, 0, 0),
                    {'soil_moisture': 45.0 + i}
                )
                time.sleep(0.05)  # 小间隔模拟快速入队
            
            # 等待所有上报完成
            time.sleep(0.5)
            
            # 验证3条数据都被上报
            self.assertEqual(mock_post.call_count, 3, "3条数据都应该被上报")
            
            # 验证队列已空
            status = self.helper.get_queue_status()
            self.assertEqual(status['size'], 0)
            
            print(f"  ✓ 3条数据快速入队")
            print(f"  ✓ 上报调用次数: {mock_post.call_count}")
            print(f"  ✓ 队列已清空")

    def test_05_queue_persistence(self):
        """
        测试场景5：队列持久化
        
        场景：
        - 数据入队
        - 程序重启（重新创建helper）
        
        预期：
        - 队列数据从JSON恢复
        - 新数据入队触发上报（包括恢复的数据）
        """
        print("\n[Test] 队列持久化")
        
        # 第一个helper实例
        self.helper = HTTPHelperV2('http://localhost:3000/api/devices/data')
        
        # 入队数据（不上报，直接停止）
        self.helper.send_multi_sensor_data(
            'DEVICE_001', 'PLANT_001',
            datetime(2026, 4, 10, 2, 0, 0),
            {'soil_moisture': 45.2}
        )
        
        # 停止第一个helper
        self.helper.stop()
        
        # 验证持久化文件存在
        self.assertTrue(os.path.exists(self.queue_path), "队列应该被持久化")
        
        with patch('app.utils.http_helper_v2.requests.post') as mock_post:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = {'code': 0}
            mock_post.return_value = mock_response
            
            # 创建第二个helper实例（模拟重启）
            self.helper = HTTPHelperV2('http://localhost:3000/api/devices/data')
            
            # 验证队列恢复
            status = self.helper.get_queue_status()
            self.assertEqual(status['size'], 1, "队列应该从JSON恢复")
            
            # 新数据入队触发上报（包括恢复的数据）
            self.helper.send_multi_sensor_data(
                'DEVICE_001', 'PLANT_001',
                datetime(2026, 4, 10, 4, 0, 0),
                {'soil_moisture': 46.0}
            )
            
            time.sleep(0.5)
            
            # 验证2条数据都被上报
            self.assertEqual(mock_post.call_count, 2, "恢复的数据和新数据都应该被上报")
            
            print(f"  ✓ 队列已持久化到: {self.queue_path}")
            print(f"  ✓ 重启后队列恢复: {status['size']} 条")
            print(f"  ✓ 上报调用次数: {mock_post.call_count}")


class TestHTTPHelperV2Integration(unittest.TestCase):
    """
    集成测试（需要真实后端服务）
    
    运行前请确保：
    - 后端服务已启动
    - 环境变量 HTTP_API_URL 已设置
    """
    
    @unittest.skip("跳过集成测试，需要真实后端服务")
    def test_real_backend_upload(self):
        """真实后端上传测试"""
        helper = HTTPHelperV2()
        
        result = helper.send_multi_sensor_data(
            'DEVICE_PLANT_001',
            'PLANT_46abed3703ed404d',
            datetime.now(),
            {
                'soil_moisture': 45.2,
                'soil_temperature': 22.5,
                'ambient_temperature': 24.1,
                'ambient_humidity': 60.3,
                'light_intensity': 8500,
                'soil_ec': 1.2,
                'soil_ph': 6.5,
                'battery_level': 85
            }
        )
        
        print(f"发送结果: {result}")
        time.sleep(2)
        
        status = helper.get_queue_status()
        print(f"队列状态: {status}")
        
        helper.stop()


def run_tests():
    """运行测试"""
    # 创建测试套件
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # 添加单元测试
    suite.addTests(loader.loadTestsFromTestCase(TestHTTPHelperV2))
    
    # 运行测试
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    return result.wasSuccessful()


if __name__ == '__main__':
    success = run_tests()
    exit(0 if success else 1)
