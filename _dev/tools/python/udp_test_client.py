#!/usr/bin/env python3
"""
UDP 测试客户端
用于测试虚拟设备的 UDP 通信功能
"""

import socket
import json
import time
import sys

def send_discovery_broadcast(port=8266):
    """发送设备发现广播"""
    print("[测试] 发送 discover 广播...")
    
    # 创建 UDP socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
    sock.settimeout(5)  # 5秒超时
    
    # 准备发现消息
    message = json.dumps({
        'cmd': 'discover',
        'app': 'proj-alpha',
        'timestamp': int(time.time() * 1000)
    })
    
    # 发送到广播地址
    broadcast_addresses = ['255.255.255.255', '192.168.1.255', '192.168.4.255']
    
    for addr in broadcast_addresses:
        try:
            sock.sendto(message.encode(), (addr, port))
            print(f"[测试] 已发送到 {addr}:{port}")
        except Exception as e:
            print(f"[测试] 发送到 {addr} 失败: {e}")
    
    # 等待响应
    print("[测试] 等待设备响应...")
    devices = []
    
    while True:
        try:
            data, addr = sock.recvfrom(1024)
            response = json.loads(data.decode())
            
            print(f"[测试] 收到来自 {addr} 的响应:")
            print(f"  命令: {response.get('cmd')}")
            print(f"  MAC: {response.get('macAddress')}")
            print(f"  名称: {response.get('deviceName')}")
            print(f"  状态: {response.get('status')}")
            
            devices.append({
                'data': response,
                'addr': addr
            })
            
        except socket.timeout:
            print("[测试] 等待超时")
            break
        except Exception as e:
            print(f"[测试] 接收错误: {e}")
            break
    
    sock.close()
    return devices

def send_wifi_config(device_ip, port, ssid, password, plant_id=''):
    """发送 WiFi 配置"""
    print(f"\n[测试] 发送 WiFi 配置到 {device_ip}:{port}...")
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(10)  # 10秒超时
    
    # 准备配置消息
    message = json.dumps({
        'cmd': 'config_wifi',
        'ssid': ssid,
        'password': password,
        'plantId': plant_id,
        'timestamp': int(time.time() * 1000)
    })
    
    try:
        sock.sendto(message.encode(), (device_ip, port))
        print(f"[测试] 配置已发送")
        
        # 等待响应
        print("[测试] 等待 config_wifi_ack 响应...")
        data, addr = sock.recvfrom(1024)
        response = json.loads(data.decode())
        
        print(f"[测试] 收到响应:")
        print(f"  命令: {response.get('cmd')}")
        print(f"  状态: {response.get('status')}")
        print(f"  消息: {response.get('message')}")
        
        return response
        
    except socket.timeout:
        print("[测试] 等待响应超时")
        return None
    except Exception as e:
        print(f"[测试] 错误: {e}")
        return None
    finally:
        sock.close()

def wait_device_online(mac_address, timeout=30):
    """等待设备上线"""
    print(f"\n[测试] 等待设备 {mac_address} 上线...")
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
    sock.settimeout(timeout)
    
    start_time = time.time()
    check_interval = 3  # 每3秒检查一次
    
    while time.time() - start_time < timeout:
        # 发送发现广播
        message = json.dumps({
            'cmd': 'discover',
            'app': 'proj-alpha',
            'timestamp': int(time.time() * 1000)
        })
        
        try:
            sock.sendto(message.encode(), ('255.255.255.255', 8266))
            
            # 等待响应
            sock.settimeout(check_interval)
            while True:
                try:
                    data, addr = sock.recvfrom(1024)
                    response = json.loads(data.decode())
                    
                    if response.get('macAddress') == mac_address:
                        if response.get('status') == 'online':
                            print(f"[测试] 设备已上线! {addr}")
                            sock.close()
                            return response
                        else:
                            print(f"[测试] 设备状态: {response.get('status')}")
                            
                except socket.timeout:
                    break
                    
        except Exception as e:
            print(f"[测试] 检查错误: {e}")
    
    print("[测试] 等待设备上线超时")
    sock.close()
    return None

def main():
    """主函数"""
    print("=" * 50)
    print("UDP 测试客户端")
    print("=" * 50)
    
    # 测试1: 设备发现
    print("\n【测试1】设备发现")
    print("-" * 50)
    devices = send_discovery_broadcast()
    
    if not devices:
        print("\n[错误] 未发现任何设备，测试终止")
        sys.exit(1)
    
    # 选择第一个设备
    device = devices[0]
    device_ip = device['addr'][0]
    device_port = device['addr'][1]
    mac_address = device['data']['macAddress']
    
    print(f"\n[信息] 选择设备: {mac_address} @ {device_ip}:{device_port}")
    
    # 测试2: WiFi配置
    print("\n【测试2】WiFi配置")
    print("-" * 50)
    
    # 使用测试WiFi配置
    test_ssid = "TestWiFi"
    test_password = "password123"
    test_plant_id = "PLANT_TEST_001"
    
    config_result = send_wifi_config(
        device_ip, 
        8266,  # 使用固定端口
        test_ssid, 
        test_password,
        test_plant_id
    )
    
    if not config_result or config_result.get('status') != 'ok':
        print("\n[错误] WiFi配置失败，测试终止")
        sys.exit(1)
    
    # 测试3: 等待设备上线
    print("\n【测试3】等待设备上线")
    print("-" * 50)
    online_device = wait_device_online(mac_address, timeout=30)
    
    if online_device:
        print("\n" + "=" * 50)
        print("[PASS] 所有测试通过!")
        print("=" * 50)
        print(f"设备已上线: {online_device.get('deviceName')}")
        print(f"MAC地址: {online_device.get('macAddress')}")
        print(f"状态: {online_device.get('status')}")
        sys.exit(0)
    else:
        print("\n" + "=" * 50)
        print("[FAIL] 测试失败: 设备未上线")
        print("=" * 50)
        sys.exit(1)

if __name__ == '__main__':
    main()
