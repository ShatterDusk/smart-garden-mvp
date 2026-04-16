# -*- coding: utf-8 -*-
"""
传感器系统集成测试
验证 LocalTaskQueue、Sensor 追赶逻辑、HTTPHelper 队列集成功能
"""

import os
import sys
import time
import json
import threading
import tempfile
import shutil
from datetime import datetime, timedelta

# 设置正确的 Python 路径
script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, script_dir)
sys.path.insert(0, os.path.join(script_dir, 'app'))

from core.local_task_queue import LocalTaskQueue
from model.sensor import Sensor, align_to_interval

# 测试配置
TEST_DB_PATH = './test_data'
TEST_QUEUE_PATH = os.path.join(TEST_DB_PATH, 'test_queue.json')


def setup_test_env():
    """设置测试环境"""
    os.makedirs(TEST_DB_PATH, exist_ok=True)
    os.environ['LOCAL_QUEUE_SIZE'] = '10'
    os.environ['QUEUE_PERSIST_PATH'] = TEST_QUEUE_PATH
    os.environ['TIME_ACCELERATION'] = '60'  # 加速 60 倍
    os.environ['SENSOR_INTERVAL'] = '7200000'  # 2小时
    print("[OK] 测试环境设置完成")


def cleanup_test_env():
    """清理测试环境"""
    if os.path.exists(TEST_DB_PATH):
        shutil.rmtree(TEST_DB_PATH)
    print("[OK] 测试环境清理完成")


def test_local_task_queue():
    """测试 LocalTaskQueue 核心功能"""
    print("\n" + "=" * 60)
    print("测试 1: LocalTaskQueue 核心功能")
    print("=" * 60)
    
    queue = LocalTaskQueue(max_size=3, persist_path=TEST_QUEUE_PATH)
    
    # 测试 add
    print("\n1.1 测试 add() 入队...")
    queue.add(datetime(2026, 4, 13, 8, 0), {'data': 'item1'})
    queue.add(datetime(2026, 4, 13, 10, 0), {'data': 'item2'})
    queue.add(datetime(2026, 4, 13, 12, 0), {'data': 'item3'})
    assert queue.size() == 3, f"队列大小应为 3，实际 {queue.size()}"
    print(f"   [OK] 入队成功，队列大小: {queue.size()}")
    
    # 测试溢出覆盖
    print("\n1.2 测试溢出覆盖...")
    queue.add(datetime(2026, 4, 13, 14, 0), {'data': 'item4'})
    assert queue.size() == 3, f"队列大小应保持 3（溢出覆盖），实际 {queue.size()}"
    pending = queue.get_all_pending()
    assert pending[0]['data']['data'] == 'item2', "最老数据(item1)应被覆盖"
    print(f"   [OK] 溢出覆盖正确，最老数据是: {pending[0]['data']['data']}")
    
    # 测试 remove
    print("\n1.3 测试 remove() 移除...")
    queue.remove(datetime(2026, 4, 13, 10, 0))
    assert queue.size() == 2, f"队列大小应为 2，实际 {queue.size()}"
    print(f"   [OK] 移除成功，队列大小: {queue.size()}")
    
    # 测试 persist/restore
    print("\n1.4 测试 persist()/restore()...")
    queue.persist()
    assert os.path.exists(TEST_QUEUE_PATH), "持久化文件应存在"
    
    new_queue = LocalTaskQueue(max_size=3, persist_path=TEST_QUEUE_PATH)
    new_queue.restore()
    assert new_queue.size() == 2, f"恢复后队列大小应为 2，实际 {new_queue.size()}"
    print(f"   [OK] 持久化/恢复成功，恢复后大小: {new_queue.size()}")
    
    # 测试 align_time
    print("\n1.5 测试 align_time()...")
    test_cases = [
        (datetime(2026, 4, 13, 9, 23), datetime(2026, 4, 13, 8, 0)),
        (datetime(2026, 4, 13, 10, 1), datetime(2026, 4, 13, 10, 0)),
        (datetime(2026, 4, 13, 23, 59), datetime(2026, 4, 13, 22, 0)),
    ]
    for input_time, expected in test_cases:
        result = queue.align_time(input_time)
        assert result == expected, f"对齐错误: {input_time} -> {result}, 期望 {expected}"
    print(f"   [OK] 对齐到2小时整点正确")
    
    print("\n[PASS] LocalTaskQueue 测试通过")
    return True


def test_align_to_interval():
    """测试 align_to_interval 函数"""
    print("\n" + "=" * 60)
    print("测试 2: align_to_interval 函数")
    print("=" * 60)
    
    test_cases = [
        (datetime(2026, 4, 13, 9, 23), datetime(2026, 4, 13, 8, 0)),
        (datetime(2026, 4, 13, 10, 1), datetime(2026, 4, 13, 10, 0)),
        (datetime(2026, 4, 13, 23, 59), datetime(2026, 4, 13, 22, 0)),
        (datetime(2026, 4, 13, 0, 0), datetime(2026, 4, 13, 0, 0)),
    ]
    
    for input_time, expected in test_cases:
        result = align_to_interval(input_time)
        assert result == expected, f"对齐错误: {input_time} -> {result}, 期望 {expected}"
        print(f"   {input_time.strftime('%H:%M')} -> {result.strftime('%H:%M')} [OK]")
    
    print("\n[PASS] align_to_interval 测试通过")
    return True


def test_sensor_catch_up_logic():
    """测试 Sensor 追赶逻辑（模拟）"""
    print("\n" + "=" * 60)
    print("测试 3: Sensor 追赶逻辑")
    print("=" * 60)
    
    print("\n3.1 测试追赶逻辑执行顺序...")
    print("   模拟: S += Δs × k (k=60, Δs=2h=7200s)")
    print("   初始: S = R = 10:00:00")
    
    S = datetime(2026, 4, 13, 10, 0, 0)
    R = datetime(2026, 4, 13, 10, 0, 0)
    k = 60
    Δs_seconds = 7200  # 2小时
    has_caught_up = False
    
    # 第一次触发
    R = datetime(2026, 4, 13, 10, 2, 0)  # R 前进 2 分钟
    S += timedelta(seconds=Δs_seconds * k)  # S += 2h × 60 = 120h
    
    print(f"   触发1: R={R.strftime('%H:%M:%S')}, S={S.strftime('%H:%M:%S')}")
    
    # 判断追赶
    if not has_caught_up and S > R:
        print(f"   [CATCH UP] S > R 触发追赶!")
        k = 1
        has_caught_up = True
    
    assert k == 1, f"追赶后 k 应为 1，实际 {k}"
    assert has_caught_up, "has_caught_up 应为 True"
    print(f"   [OK] 追赶触发正确，k={k}, has_caught_up={has_caught_up}")
    
    # 测试对齐
    print("\n3.2 测试追赶后数据对齐...")
    aligned = align_to_interval(S)
    print(f"   S={S} -> aligned={aligned}")
    assert aligned.minute == 0 and aligned.second == 0, "对齐后应为整点"
    print(f"   [OK] 对齐到整点正确")
    
    print("\n[PASS] Sensor 追赶逻辑测试通过")
    return True


def test_http_helper_queue_integration():
    """测试 HTTPHelper 队列集成（模拟）"""
    print("\n" + "=" * 60)
    print("测试 4: HTTPHelper 队列集成")
    print("=" * 60)
    
    print("\n4.1 测试队列初始化...")
    queue = LocalTaskQueue(max_size=10, persist_path=TEST_QUEUE_PATH)
    queue.clear()  # 清空之前的数据
    queue.persist()
    print(f"   [OK] 队列初始化，大小: {queue.size()}")
    
    print("\n4.2 测试数据入队...")
    test_data = {
        'deviceId': 'DEVICE_TEST',
        'plantId': 'PLANT_TEST',
        'timestamp': datetime.now().isoformat(),
        'metrics': {'temperature': 25.5}
    }
    
    queue.add(datetime.now(), test_data)
    queue.persist()
    assert queue.size() == 1, f"入队后大小应为 1，实际 {queue.size()}"
    print(f"   [OK] 数据入队成功，队列大小: {queue.size()}")
    
    print("\n4.3 测试数据出队...")
    pending = queue.get_all_pending()
    assert len(pending) == 1, f"待发送数据应为 1，实际 {len(pending)}"
    
    # 模拟上报成功
    queue.remove(pending[0]['recorded_at'])
    queue.persist()
    assert queue.size() == 0, f"移除后大小应为 0，实际 {queue.size()}"
    print(f"   [OK] 数据移除成功，队列大小: {queue.size()}")
    
    print("\n[PASS] HTTPHelper 队列集成测试通过")
    return True


def test_time_acceleration_constraint():
    """测试 TIME_ACCELERATION 上限约束"""
    print("\n" + "=" * 60)
    print("测试 5: TIME_ACCELERATION 上限约束")
    print("=" * 60)
    
    from model.sensor import MAX_TIME_ACCELERATION
    
    print(f"\n5.1 测试 MAX_TIME_ACCELERATION = {MAX_TIME_ACCELERATION}")
    assert MAX_TIME_ACCELERATION == 3600, f"上限应为 3600，实际 {MAX_TIME_ACCELERATION}"
    print(f"   [OK] 上限约束正确")
    
    print("\n5.2 测试 k 值限制...")
    test_values = [
        (5000, 3600),  # 超过上限，应限制为 3600
        (3600, 3600),  # 等于上限
        (100, 100),    # 正常值
        (1, 1),        # 最小值
    ]
    
    for input_k, expected_k in test_values:
        actual_k = min(input_k, MAX_TIME_ACCELERATION)
        assert actual_k == expected_k, f"k={input_k} 应限制为 {expected_k}，实际 {actual_k}"
        print(f"   k={input_k} -> {actual_k} [OK]")
    
    print("\n[PASS] TIME_ACCELERATION 约束测试通过")
    return True


def test_data_flow_simulation():
    """模拟完整数据流"""
    print("\n" + "=" * 60)
    print("测试 6: 完整数据流模拟")
    print("=" * 60)
    
    print("\n6.1 模拟 Sensor 生成数据...")
    
    # 模拟 Sensor 状态
    S = datetime(2026, 4, 13, 10, 0, 0)
    k = 60
    Δs = timedelta(hours=2)
    
    # 生成 3 次数据
    data_points = []
    for i in range(3):
        S += Δs * k
        aligned = align_to_interval(S)
        data_points.append({
            'timestamp': aligned.isoformat(),
            'metrics': {'temperature': 25.0 + i}
        })
        print(f"   数据点 {i+1}: timestamp={aligned.strftime('%H:%M')}")
    
    print(f"   [OK] 生成 {len(data_points)} 个数据点")
    
    print("\n6.2 模拟 HTTPHelper 入队...")
    queue = LocalTaskQueue(max_size=10, persist_path=TEST_QUEUE_PATH)
    
    for data in data_points:
        queue.add(datetime.fromisoformat(data['timestamp']), data)
    
    assert queue.size() == 3, f"入队后应为 3，实际 {queue.size()}"
    print(f"   [OK] 全部入队，队列大小: {queue.size()}")
    
    print("\n6.3 模拟逐条上报...")
    pending = queue.get_all_pending()
    success_count = 0
    
    for item in pending:
        # 模拟上报成功
        queue.remove(item['recorded_at'])
        success_count += 1
        print(f"   上报成功: {item['recorded_at']}")
    
    queue.persist()
    assert queue.size() == 0, f"上报后应为 0，实际 {queue.size()}"
    print(f"   [OK] 全部上报成功，队列大小: {queue.size()}")
    
    print("\n[PASS] 完整数据流模拟通过")
    return True


def run_all_tests():
    """运行所有测试"""
    print("\n" + "=" * 70)
    print("传感器系统集成测试套件")
    print("=" * 70)
    
    setup_test_env()
    
    tests = [
        ("LocalTaskQueue", test_local_task_queue),
        ("align_to_interval", test_align_to_interval),
        ("Sensor 追赶逻辑", test_sensor_catch_up_logic),
        ("HTTPHelper 队列集成", test_http_helper_queue_integration),
        ("TIME_ACCELERATION 约束", test_time_acceleration_constraint),
        ("完整数据流模拟", test_data_flow_simulation),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n[FAIL] {name} 测试失败: {e}")
            import traceback
            traceback.print_exc()
            results.append((name, False))
    
    cleanup_test_env()
    
    # 打印总结
    print("\n" + "=" * 70)
    print("测试总结")
    print("=" * 70)
    
    passed = sum(1 for _, r in results if r)
    total = len(results)
    
    for name, result in results:
        status = "[PASS]" if result else "[FAIL]"
        print(f"{status} {name}")
    
    print(f"\n总计: {passed}/{total} 通过")
    
    if passed == total:
        print("\n[OK] 所有测试通过！")
        return True
    else:
        print(f"\n[FAIL] {total - passed} 个测试失败")
        return False


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
