#!/usr/bin/env python3

import os
import sys
import subprocess
import requests
import tarfile
import atexit
import signal
import time
from pathlib import Path

# 全局变量，用于存储frpc进程
frpc_process = None
should_exit = False

# 硬编码配置参数
SERVER_ADDR = "47.121.220.248"  # 替换为你的实际服务器IP
SERVER_PORT = "7000"
TOKEN = "ymc"  # 与服务器端保持一致
MYSQL_LOCAL_PORT = "3306"
MYSQL_REMOTE_PORT = "3306"
FRP_VERSION = "0.51.3"

# 固定目录
FRP_DIR = os.path.join(str(Path.home()), "frp_client")

def cleanup():
    """终止frpc进程"""
    global frpc_process
    if frpc_process:
        print("正在终止FRP客户端...")
        try:
            # 尝试优雅终止
            frpc_process.terminate()
            # 给进程5秒时间优雅退出
            for _ in range(50):
                if frpc_process.poll() is not None:
                    break
                time.sleep(0.1)
            # 如果进程仍在运行，强制终止
            if frpc_process.poll() is None:
                print("进程未响应，强制终止...")
                frpc_process.kill()
                frpc_process.wait()
        except Exception as e:
            print(f"终止进程时出错: {e}")
        print("FRP客户端已终止")

def signal_handler(sig, frame):
    """处理Ctrl+C信号"""
    global should_exit
    print("\n检测到Ctrl+C，正在清理...")
    should_exit = True
    cleanup()
    sys.exit(0)

def main():
    global frpc_process, should_exit
    
    # 注册信号处理和退出清理
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    atexit.register(cleanup)
    
    # 创建固定目录
    os.makedirs(FRP_DIR, exist_ok=True)
    print(f"使用固定目录: {FRP_DIR}")
    
    frpc_path = os.path.join(FRP_DIR, "frpc")
    frpc_ini_path = os.path.join(FRP_DIR, "frpc.ini")
    
    try:
        # 检查FRP客户端是否已下载
        if not os.path.exists(frpc_path):
            print("FRP客户端不存在，开始下载...")
            download_url = f"https://github.com/fatedier/frp/releases/download/v{FRP_VERSION}/frp_{FRP_VERSION}_darwin_amd64.tar.gz"
            tar_path = os.path.join(FRP_DIR, "frp.tar.gz")
            
            response = requests.get(download_url, stream=True)
            with open(tar_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            print("解压FRP客户端...")
            with tarfile.open(tar_path, 'r:gz') as tar:
                tar.extractall(path=FRP_DIR)
            
            frp_extract_dir = os.path.join(FRP_DIR, f"frp_{FRP_VERSION}_darwin_amd64")
            # 检查文件是否存在
            if os.path.exists(os.path.join(frp_extract_dir, "frpc")):
                os.rename(os.path.join(frp_extract_dir, "frpc"), frpc_path)
                os.chmod(frpc_path, 0o755)
                
                # 清理下载文件和解压目录
                os.remove(tar_path)
                import shutil
                shutil.rmtree(frp_extract_dir)
            else:
                print(f"错误：未找到frpc文件在{frp_extract_dir}目录")
                return
        else:
            print("FRP客户端已存在，跳过下载步骤...")
        
        # 创建/更新配置文件
        with open(frpc_ini_path, 'w') as f:
            f.write(f"""[common]
server_addr = {SERVER_ADDR}
server_port = {SERVER_PORT}
token = {TOKEN}

[mysql]
type = tcp
local_ip = 127.0.0.1
local_port = {MYSQL_LOCAL_PORT}
remote_port = {MYSQL_REMOTE_PORT}
""")
        
        # 启动FRP客户端
        print(f"启动FRP客户端，将本地MySQL({MYSQL_LOCAL_PORT})映射到{SERVER_ADDR}:{MYSQL_REMOTE_PORT}")
        print("按Ctrl+C终止映射...")
        
        # 使用更健壮的方式启动和监控进程
        frpc_process = subprocess.Popen(
            [frpc_path, "-c", frpc_ini_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True
        )
        
        # 监控进程输出并保持主程序运行
        while not should_exit:
            if frpc_process.poll() is not None:
                # 进程已退出
                print(f"FRP客户端已退出，退出码: {frpc_process.returncode}")
                break
                
            # 读取输出（非阻塞）
            output = None
            try:
                output = frpc_process.stdout.readline()
                if output:
                    print(output.strip())
            except:
                pass
                
            time.sleep(0.1)
        
    except KeyboardInterrupt:
        print("\n用户中断，停止映射...")
    except Exception as e:
        print(f"发生错误: {str(e)}")
    finally:
        cleanup()
        print(f"配置文件位于: {frpc_ini_path}")
        print("程序已退出，FRP映射已终止")

if __name__ == "__main__":
    main()
