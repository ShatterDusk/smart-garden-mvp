#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
日志服务
支持彩色输出和文件轮转
"""

import logging
import sys
import os
from datetime import datetime
from logging.handlers import RotatingFileHandler
from typing import Optional


class ColoredFormatter(logging.Formatter):
    """带颜色的日志格式化器"""
    
    COLORS = {
        'DEBUG': '\033[36m',
        'INFO': '\033[32m',
        'WARNING': '\033[33m',
        'ERROR': '\033[31m',
        'CRITICAL': '\033[35m',
    }
    RESET = '\033[0m'
    
    def __init__(self, use_color: bool = True):
        super().__init__(
            '[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        self.use_color = use_color
    
    def format(self, record):
        if self.use_color and record.levelname in self.COLORS:
            record.levelname = f"{self.COLORS[record.levelname]}{record.levelname}{self.RESET}"
        return super().format(record)


class Logger:
    """日志管理器"""
    
    _instance: Optional['Logger'] = None
    _logger: Optional[logging.Logger] = None
    
    def __new__(cls, name: str = 'virtual_device', verbose: bool = False):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._init_logger(name, verbose)
        return cls._instance
    
    def _init_logger(self, name: str, verbose: bool = False):
        self._logger = logging.getLogger(name)
        self._logger.setLevel(logging.DEBUG if verbose else logging.INFO)
        self._logger.handlers = []
        
        use_color = sys.stdout.isatty()
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(ColoredFormatter(use_color=use_color))
        self._logger.addHandler(console_handler)
    
    def setup_file_handler(self, log_file: str, max_bytes: int = 10*1024*1024, backup_count: int = 5):
        """设置文件日志处理器"""
        os.makedirs(os.path.dirname(log_file), exist_ok=True)
        file_handler = RotatingFileHandler(
            log_file,
            maxBytes=max_bytes,
            backupCount=backup_count,
            encoding='utf-8'
        )
        file_handler.setFormatter(logging.Formatter(
            '[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        ))
        self._logger.addHandler(file_handler)
    
    def debug(self, msg: str):
        self._logger.debug(msg)
    
    def info(self, msg: str):
        self._logger.info(msg)
    
    def warning(self, msg: str):
        self._logger.warning(msg)
    
    def error(self, msg: str):
        self._logger.error(msg)
    
    def critical(self, msg: str):
        self._logger.critical(msg)


def setup_logging(name: str = 'virtual_device', verbose: bool = False, log_file: Optional[str] = None) -> Logger:
    """设置日志"""
    logger = Logger(name, verbose)
    if log_file:
        logger.setup_file_handler(log_file)
    return logger
