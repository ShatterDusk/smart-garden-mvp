"""日志系统"""
import structlog
import sys
from typing import Optional

def setup_logging(level: str = "INFO", format_type: str = "json"):
    """配置日志"""
    
    if format_type == "json":
        from pythonjsonlogger import jsonlogger
        
        formatter = jsonlogger.JsonFormatter(
            "%(asctime)s %(name)s %(levelname)s %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
        
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(formatter)
        
        root_logger = logging.getLogger()
        root_logger.addHandler(handler)
        root_logger.setLevel(getattr(logging, level.upper()))
    else:
        structlog.configure(
            processors=[
                structlog.contextvars.merge_contextvars,
                structlog.stdlib.add_log_level_number,
                structlog.stdlib.PositionalArgumentsFormatter(),
                structlog.processors.TimeStamper(fmt="iso"),
                structlog.dev.ConsoleRenderer(colors=True),
            ],
            wrapper_class=structlog.make_filtering_bound_logger,
            context_class=dict,
            logger_factory=structlog.PrintLoggerFactory(),
            cache_logger_on_first_use=True,
        )
    
    return structlog.get_logger()


try:
    import logging as _logging
    
    def get_logger(name: str = "virtual_device") -> object:
        return _logging.getLogger(name)
except ImportError:
    def get_logger(name: str = "virtual_device"):
        return structlog.get_logger(name)
