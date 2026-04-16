from nicegui import ui
from model.device import Device
from components.logs_dialog import LogsDialog
from components.sensor_selection import SensorSelection
from components.chart import Chart
from utils.iot_hub_helper import IoTHubHelper
from utils.mqtt_helper import MQTTHelper
from utils.http_helper import HTTPHelper
from utils.export_helper import ExportHelper
import asyncio


class ContainerCard():
    '''Container card component for displaying container information'''

    def __init__(self, wrapper, container, start_callback=None, stop_callback=None, delete_callback=None, live_view_callback=None):
        '''Initializes the container card'''

        self.wrapper = wrapper
        self.container = container
        self.card = None
        self.visible = True
        self.sensor_count = 0
        self.generated_container_data = None
        self.logs_dialog = LogsDialog(wrapper)
        container.log = self.logs_dialog.log
        self.active_dot = None
        self.setup(wrapper, container, start_callback=start_callback,
                   stop_callback=stop_callback, delete_callback=delete_callback, live_view_callback=live_view_callback)

    def setup(self, wrapper, container, start_callback=None, stop_callback=None, delete_callback=None, live_view_callback=None):
        '''Sets up initial UI elements of the container card'''

        self.update_sensor_count()

        with ui.card().tight().bind_visibility(self, 'visible') as card:
            self.card = card
            with ui.card_section().classes('min-h-[260px]'):
                # Container header
                with ui.row().classes('pb-2 w-full justify-between items-center border-b border-gray-200'):
                    ui.label(container.name).classes('text-xl font-semibold')
                    with ui.row().classes('gap-0.5'):
                        ui.button(icon='insert_chart_outlined', on_click=lambda: live_view_callback(
                            container)).props('flat').classes('px-2 text-black')
                        with ui.button(icon='more_vert').props('flat').classes('px-2 text-black'):
                            with ui.menu().props(remove='no-parent-event'):
                                ui.menu_item('查看详情', lambda: self.show_details_dialog()).classes(
                                    'flex items-center')
                                ui.menu_item('查看日志', lambda: self.show_logs_dialog(container)).classes(
                                    'flex items-center')
                                ui.menu_item('删除', lambda w=wrapper, c=container, callback=delete_callback: self.show_delete_dialog(
                                    w, c, callback)).classes('text-red-500').classes('flex items-center')
                
                # Container information
                with ui.column().classes('py-4 gap-2'):
                    with ui.row().classes('gap-1'):
                        ui.label('设备:').classes('text-sm font-medium')
                        ui.label().classes('text-sm').bind_text_from(container,
                                                                     'devices', backward=lambda d: len(d))
                    with ui.row().classes('gap-1'):
                        ui.label('传感器:').classes('text-sm font-medium')
                        ui.label().bind_text(self, 'sensor_count').classes('text-sm')
                    with ui.row().classes('gap-1'):
                        ui.label('已发送消息:').classes(
                            'text-sm font-medium')
                        ui.label().classes('text-sm').bind_text(container, 'message_count')
                    with ui.row().classes('gap-1'):
                        ui.label('启动时间:').classes('text-sm font-medium')
                        ui.label().classes('text-sm').bind_text_from(container, 'start_time',
                                                                     backward=lambda t: f'{t.strftime("%Y-%m-%d %H:%M:%S")}' if t else '')
            
            # Container controls
            with ui.card_section().classes('bg-gray-100'):
                with ui.row().classes('items-center justify-between'):
                    with ui.row().classes('gap-3 items-center'):
                        self.active_dot = ui.row().classes('h-4 w-4 rounded-full' +
                                                           (' bg-green-500' if container.is_active else ' bg-red-500'))
                        ui.label().bind_text_from(container, 'is_active',
                                                  backward=lambda is_active: f'{"活跃" if is_active else "停止"}')
                    with ui.row().classes('h-9 gap-0.5'):
                        with ui.row().classes('gap-0.5'):
                            ui.button(icon='play_arrow', on_click=lambda: self.show_interface_selection_dialog(container, start_callback)).props('flat').classes('px-2 text-black')
                            ui.button(icon='pause', on_click=lambda c=container: stop_callback(
                                c)).props('flat').classes('px-2 text-black')
                        ui.row().classes('w-px h-full bg-gray-300')
                        ui.button(icon='exit_to_app', on_click=lambda: self.show_export_dialog()).props('flat').classes('px-2 text-black')

    def set_active(self):
        '''Sets the container to active'''
        self.active_dot.classes('bg-green-500', remove='bg-red-500')

    def set_inactive(self):
        '''Sets the container to inactive'''
        self.active_dot.classes('bg-red-500', remove='bg-green-500')

    def update_sensor_count(self):
        '''Updates the sensor count'''
        self.sensor_count = 0
        for device in self.container.devices:
            self.sensor_count += len(device.sensors)

    def show_interface_selection_dialog(self, container, start_callback):
        '''Shows the interface selection dialog, wheather to use IoT Hub or MQTT'''
        with self.wrapper:
            with ui.dialog(value=True) as dialog, ui.card().classes("px-6 pb-6 overflow-auto"):
                with ui.row().classes("w-full justify-between items-center"):
                    ui.label(
                        "选择接口").classes("text-xl font-semibold")
                    ui.button(icon="close", on_click=dialog.close).props(
                        "flat").classes("px-2 text-black")
                
                with ui.column():
                    ui.label("选择要通过哪个接口发送数据。")

                # IoT Hub
                with ui.row().classes("w-full justify-between items-center md:flex-nowrap md:gap-8"):
                    host_name = IoTHubHelper.get_host_name()
                    host_name_is_none = host_name is None
                    host_name = host_name if host_name else '未配置'
                    
                    with ui.column().classes("mt-4 gap-1"):
                        ui.label("IoT Hub").classes("text-sm font-medium")
                        ui.label(f"主机名: {host_name}")
                        iot_hub_note_label = ui.label().classes("mt-2 py-1 px-2 text-x text-gray-600 bg-gray-100 rounded-md")
                    iot_hub_start_button = ui.button('启动', icon='play_arrow', on_click=lambda: self.start_handler(dialog, start_callback, container, "iothub")).classes('w-28 shrink-0')
                    
                    if host_name_is_none:
                        iot_hub_note_label.text = "请配置环境变量 (参见 README.md)"
                        iot_hub_start_button.set_enabled(False)
                    else:
                        iot_hub_note_label.set_visibility(False)

                # Separator
                with ui.row().classes("w-full items-center"):
                    ui.row().classes("h-px grow bg-gray-300")
                    ui.label("或").classes("text-sm font-medium")
                    ui.row().classes("h-px grow bg-gray-300")

                # MQTT
                with ui.row().classes("w-full justify-between items-center md:flex-nowrap md:gap-8"):
                    mqtt_broker_address = MQTTHelper.get_broker_address()
                    mqtt_broker_port = MQTTHelper.get_broker_port()

                    mqtt_broker_address = mqtt_broker_address if mqtt_broker_address else '未配置'
                    mqtt_broker_port = mqtt_broker_port if mqtt_broker_port else '未配置'

                    with ui.column().classes("mt-4 gap-1"):
                        ui.label("MQTT Broker").classes("text-sm font-medium")
                        ui.label(f"地址: {mqtt_broker_address}")
                        ui.label(f"端口: {mqtt_broker_port}")
                    mqtt_start_button = ui.button('启动', icon='play_arrow', on_click=lambda: self.start_handler(dialog, start_callback, container, "mqtt")).classes('w-28 shrink-0')

                    if not MQTTHelper.is_configured():
                        mqtt_start_button.set_enabled(False)

                # Separator
                with ui.row().classes("w-full items-center"):
                    ui.row().classes("h-px grow bg-gray-300")
                    ui.label("或").classes("text-sm font-medium")
                    ui.row().classes("h-px grow bg-gray-300")

                # HTTP API (直接推送到后端)
                with ui.row().classes("w-full justify-between items-center md:flex-nowrap md:gap-8"):
                    import os
                    http_api_url = os.getenv("HTTP_API_URL", "http://localhost:3000/api/devices/data")
                    is_configured = os.getenv("HTTP_API_URL") is not None
                    http_api_url_display = http_api_url if is_configured else 'http://localhost:3000/api/devices/data (默认)'

                    with ui.column().classes("mt-4 gap-1"):
                        ui.label("HTTP API (直接推送)").classes("text-sm font-medium")
                        ui.label(f"API: {http_api_url_display}")
                        http_note_label = ui.label().classes("mt-2 py-1 px-2 text-x text-gray-600 bg-gray-100 rounded-md")
                    http_start_button = ui.button('启动', icon='play_arrow', on_click=lambda: self.start_handler(dialog, start_callback, container, "http")).classes('w-28 shrink-0')

                    # 暂时强制启用按钮用于测试
                    http_note_label.set_visibility(False)

    def start_handler(self, dialog, start_callback, container, interface):
        '''Starts the container and closes the dialog'''
        dialog.close()
        start_callback(container, interface)

    def show_details_dialog(self):
        '''Shows the details dialog'''
        with self.wrapper:
            with ui.dialog(value=True) as dialog, ui.card().classes("px-6 pb-6 w-[696px] !max-w-none overflow-auto"):
                self.dialog = dialog
                with ui.row().classes("w-full justify-between items-center"):
                    ui.label(
                        f"详情 - '{self.container.name}'").classes("text-xl font-semibold")
                    ui.button(icon="close", on_click=self.dialog.close).props(
                        "flat").classes("px-2 text-black")

                with ui.row().classes("w-full flex justify-between"):
                    # Container information
                    with ui.column().classes("gap-4"):
                        ui.label("基本信息").classes(
                            "text-lg font-semibold mt-2")
                        with ui.row().classes("grid grid-cols-2 gap-y-4 gap-x-10 sm:flex"):
                            with ui.column().classes("gap-0"):
                                ui.label("ID").classes("text-sm text-gray-500")
                                ui.label(f"{self.container.id}").classes(
                                    "text-md font-medium")
                            with ui.column().classes("gap-0"):
                                ui.label("名称").classes(
                                    "text-sm text-gray-500")
                                ui.label(f"{self.container.name}").classes(
                                    "text-md font-medium")
                            with ui.column().classes("gap-0"):
                                ui.label("位置").classes(
                                    "text-sm text-gray-500")
                                location = self.container.location
                                ui.label(f"{location if location else '无'}").classes(
                                    "text-md font-medium")
                        with ui.row().classes("gap-10"):
                            with ui.column().classes("gap-0"):
                                ui.label("描述").classes(
                                    "text-sm text-gray-500")
                                description = self.container.description
                                ui.label(f"{description if description else '无'}").classes(
                                    "text-md font-medium")
                                
                    # Container status
                    with ui.column().classes('pr-3 gap-1 items-end'):
                        ui.label("状态").classes("text-sm text-gray-500")
                        with ui.row().classes('gap-3 items-center'):
                            ui.row().classes(
                                f'h-4 w-4 rounded-full {"bg-green-500" if self.container.is_active else "bg-red-500"}')
                            ui.label().bind_text_from(self.container, 'is_active',
                                                      backward=lambda is_active: f'{"活跃" if is_active else "停止"}')

                # Container and sensors
                with ui.column().classes("w-full gap-4"):
                    ui.label("设备和传感器").classes(
                        "text-lg font-semibold mt-2")

                    # Device tree
                    with ui.row().classes("gap-x-28"):
                        with ui.column().classes('gap-0'):
                            ui.label("视图").classes(
                                "text-sm text-gray-500")
                            data = self.create_tree_data(
                                self.container.devices)
                            with ui.row() as row:
                                self.tree_container = row
                                ui.tree(
                                    data, label_key="id")

                        # Add device
                        unassigned_devices = Device.get_all_unassigned()
                        with ui.column().classes('gap-0'):
                            device_options = {
                                device.id: device.name for device in unassigned_devices}

                            ui.label("编辑").classes(
                                "text-sm text-gray-500")
                            if len(unassigned_devices) > 0:
                                with ui.row().classes("items-center"):
                                    self.new_device_select = ui.select(
                                        value=unassigned_devices[0].id, options=device_options).classes("min-w-[120px]")
                                    ui.button("添加", on_click=self.add_device_handler).props(
                                        "flat")
                            else:
                                ui.label(
                                    "没有更多可用设备。").classes()

    def create_tree_data(self, devices):
        '''Creates the tree data for the device tree'''
        tree = []
        for device in devices:
            device_node = {'id': device.name, 'children': []}
            for sensor in device.sensors:
                sensor_node = {'id': sensor.name}
                device_node['children'].append(sensor_node)
            tree.append(device_node)
        return tree
    
    def show_export_dialog(self):
        '''Shows the export dialog for exporting bulk data'''
        if len(self.container.devices) == 0:
            ui.notify("没有可用设备!", type="warning")
            return

        if self.container.is_active:
            ui.notify("请先停止容器，才能执行批量导出。", type="warning")
            return

        with self.wrapper:
            with ui.dialog(value=True) as dialog, ui.card().classes("relative px-6 pb-6 w-[696px] !max-w-none overflow-auto") as card:
                self.dialog = dialog
                self.bulk_export_card = card
                with ui.row().classes("w-full justify-between items-center"):
                    ui.label(
                        f"批量导出 - '{self.container.name}'").classes("text-xl font-semibold")
                    ui.button(icon="close", on_click=dialog.close).props(
                        "flat").classes("px-2 text-black")
                
                ui.label("执行批量导出，选择数据导出方式。")

                # Bulk data generation
                with ui.row().classes("gap-6 items-center"):
                    self.bulk_amount_input = ui.number(label="每个传感器数值", min=1, max=1000000, step=1, value=100).classes('w-24')
                    ui.button("生成数据", on_click=self.generate_bulk_data).props("flat")

                # Visualization
                ui.label("预览").classes("text-lg font-semibold mt-2")

                self.sensor_selection = SensorSelection(container=self.container, sensor_select_callback=self.update_export_preview)
                self.chart = Chart()

                self.export_button = ui.button("导出", on_click=self.save_bulk_to_file).classes("mt-8 self-end")
                self.export_button.set_enabled(False)

    async def generate_bulk_data(self):
        '''Generates bulk data for the export'''
        bulk_export_spinner = None

        with self.bulk_export_card:
            with ui.row().classes("absolute top-0 left-0 w-full h-full bg-black opacity-20 z-10") as overlay:
                bulk_export_spinner = overlay
                ui.spinner(size='lg').classes("absolute top-1/2 left-1/2 transform -translate-x-full -translate-y-1/2")

        self.chart.show_note("正在生成数据...", force=True)
        await asyncio.sleep(0.1) # Workaround to make the spinner visible

        container_data = {}
        bulk_amount = int(self.bulk_amount_input.value)

        for device in self.container.devices:
            device_data = {}
            for sensor in device.sensors:
                data = sensor.start_bulk_simulation(bulk_amount)
                device_data[sensor.name] = data
            container_data[device.name] = device_data
        
        self.generated_container_data = container_data

        if bulk_amount <= 1000:
            self.show_export_preview(container_data)
        else:
            self.chart.show_note("预览不可用 (超过 1,000 个值)", force=True)
        self.export_button.set_enabled(True)

        bulk_export_spinner.clear()
        bulk_export_spinner.set_visibility(False)

    def save_bulk_to_file(self):
        '''Saves the generated bulk data to a file'''
        ExportHelper().save_to_file(self.generated_container_data)
        ui.notify(f"数据导出成功", type="positive")
        self.dialog.close()

    def show_export_preview(self, container_data):
        '''Shows the export preview chart'''
        selected_sensor = self.sensor_selection.get_sensor()
        time_series_data = container_data[selected_sensor.device.name][selected_sensor.name]
        self.chart.show(time_series_data=time_series_data)

    def update_export_preview(self, sensor):
        '''Updates the export preview chart'''
        if self.generated_container_data is None:
            return
        elif sensor is None:
            self.chart.empty()
            return
        
        time_series_data = self.generated_container_data[sensor.device.name][sensor.name]
        self.chart.update(sensor, time_series_data)

    def add_device_handler(self):
        '''Adds a device to the container'''
        if self.container.is_active:
            ui.notify(
                f"容器正在运行时无法添加设备。", type="negative")
            return

        device_id = self.new_device_select.value
        device = Device.get_by_id(device_id)
        device.container_id = self.container.id
        Device.session.commit()

        ui.notify(f"设备添加成功。", type="positive")
        self.update_sensor_count()

        # Remove device from select
        del self.new_device_select.options[device_id]
        self.new_device_select.update()
        self.new_device_select.value = None

        # Show device in tree
        new_data = self.create_tree_data(self.container.devices)
        self.tree_container.clear()
        with self.tree_container:
            ui.tree(new_data, label_key="id")

    def show_logs_dialog(self, container):
        '''Shows the logs dialog'''
        if not container.is_active:
            ui.notify('容器未运行', type='warning')
            return

        self.logs_dialog.show()

    def show_delete_dialog(self, wrapper, container, delete_callback):
        '''Shows the delete dialog'''
        with wrapper:
            with ui.dialog(value=True) as dialog, ui.card().classes('items-center'):
                ui.label('确定要删除此容器吗?')
                with ui.row():
                    ui.button('取消', on_click=dialog.close).props('flat')
                    ui.button('删除', on_click=lambda: delete_callback(
                        container, dialog)).classes('text-white bg-red')
