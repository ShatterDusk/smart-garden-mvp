# Load environment variables FIRST (before any other imports)
from dotenv import load_dotenv
load_dotenv(override=True)

import os

from nicegui import ui
from utils.iot_hub_helper import IoTHubHelper
from pages.containers_page import ContainersPage
from pages.sensors_page import SensorsPage
from pages.devices_page import DevicesPage
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from model.models import Base
from model.option import Option
from model.container import Container
from model.device import Device
from model.sensor import Sensor

# Create database if it does not exist
# Setup database session - 使用相对于脚本文件的路径，确保数据库始终在正确位置
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(script_dir)
db_path = os.path.join(project_root, 'telemetry_simulator.db')
engine = create_engine(f'sqlite:///{db_path}')
Base.metadata.create_all(engine)
Session = sessionmaker(bind=engine)
session = Session()

# Set database session for all models
Option.session = session
Container.session = session
Device.session = session
Sensor.session = session


# Create IoT Hub helper
iot_hub_helper = IoTHubHelper()

@ui.page('/')
def containers_page():
    '''Renders the containers page at / path.'''
    ContainersPage(iot_hub_helper)


@ui.page('/geraete')
def devices_page():
    '''Renders the devices page at /geraete path.'''
    DevicesPage(iot_hub_helper)


@ui.page('/sensoren')
def sensors_page():
    '''Renders the sensors page at /sensoren path.'''
    SensorsPage()


# Start the UI
ui.run(title="IoT Telemetrie Simulator", host="127.0.0.1", port=8080)
