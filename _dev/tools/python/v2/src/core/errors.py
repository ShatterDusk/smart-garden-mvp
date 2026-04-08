"""错误处理模块"""


class VirtualDeviceError(Exception):
    code: int = 1000

    def __init__(self, message: str = "", **kwargs):
        self.message = message
        self.details = kwargs
        super().__init__(self.message)

    def to_dict(self) -> dict:
        return {"code": self.code, "message": self.message}


class DeviceNotFoundError(VirtualDeviceError):
    code = 2000


class DeviceAlreadyRunningError(VirtualDeviceError):
    code = 2001


class DeviceNotRunningError(VirtualDeviceError):
    code = 2002


class ScenarioNotFoundError(VirtualDeviceError):
    code = 3000


class InvalidParameterError(VirtualDeviceError):
    code = 1001
