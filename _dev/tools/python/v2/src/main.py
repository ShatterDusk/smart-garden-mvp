"""虚拟设备模拟器 V2 - FastAPI 应用入口"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import AppConfig
from .routes import api

config = AppConfig.load()

app = FastAPI(
    title="虚拟设备模拟器 V2",
    description="PlantGPT 虚拟设备模拟系统",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api.router)


@app.get("/")
async def root():
    return {
        "name": "虚拟设备模拟器 V2",
        "version": "2.0.0",
        "status": "running",
        "docs_url": "/docs",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "src.main:app",
        host=config.server.host,
        port=config.server.port,
        reload=config.server.debug,
    )
