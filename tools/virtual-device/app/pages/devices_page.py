from nicegui import ui
from components.navigation import Navigation
from model.device import Device
from model.sensor import Sensor
from components.device_item import DeviceItem


class DevicesPage:
    '''This class represents the devices page.'''

    def __init__(self, iot_hub_helper):
        '''Initializes the page'''
        self.iot_hub_helper = iot_hub_helper
        self.devices = Device.get_all()
        self.list_items = []
        self.update_stats()
        self.setup_page()

    def setup_page(self):
        '''Sets up the page'''
        Navigation()
        ui.query('.nicegui-content').classes('mx-auto max-w-screen-2xl p-8')
        ui.label("设备管理").classes('text-2xl font-bold')

        self.setup_menu_bar()
        self.setup_list()

    def setup_menu_bar(self):
        '''Sets up the menu bar'''
        with ui.row().classes('p-4 w-full flex items-center justify-between bg-gray-200 rounded-lg shadow-md'):
            # Create new device
            ui.button('创建设备',
                      on_click=lambda: self.show_create_device_dialog()).classes('')

            # Stats
            with ui.row().classes('gap-1'):
                ui.label('总计:').classes('text-sm font-medium')
                ui.label().classes('text-sm').bind_text(self, 'devices_count')

            # Filter
            with ui.row():
                self.filter_input = ui.input(
                    placeholder='筛选', on_change=self.filter_handler).classes('w-44')

    def setup_list(self):
        '''Sets up the list of devices'''
        self.list_container = ui.column().classes('relative w-full min-w-[600px] gap-0 divide-y')

        with self.list_container:
            # Add headings row
            headings = [{'name': 'ID', 'classes': 'w-[30px]'},
                        {'name': '名称', 'classes': 'w-[130px]'},
                        {'name': '容器', 'classes': 'w-[130px]'},
                        {'name': '传感器', 'classes': 'w-[60px]'}]

            with ui.row().classes('px-3 py-6 flex gap-6 items-center w-full'):
                for heading in headings:
                    ui.label(heading['name']).classes(
                        f'font-medium {heading["classes"]}')

            self.setup_note_label()

             # Print list items
            if len(self.devices) == 0:
                self.show_note('暂无设备')
            else:
                for device in self.devices:
                    new_item = DeviceItem(device=device,
                                          delete_callback=self.delete_button_handler)
                    self.list_items.append(new_item)

    def setup_note_label(self):
        '''Sets up the note label'''
        with self.list_container:
            self.note_label = ui.label().classes(
                'absolute left-1/2 top-48 self-center -translate-x-1/2 !border-t-0')
            self.note_label.set_visibility(False)

    def filter_handler(self):
        '''Handles the filter input'''
        search_text = self.filter_input.value
        results = list(filter(lambda item: search_text.lower()
                       in item.device.name.lower(), self.list_items))

        for item in self.list_items:
            item.visible = item in results

        if len(results) == 0:
            self.show_note('无匹配结果')
        else:
            self.hide_note()

        if len(results) == 1:
            self.list_container.classes(add='divide-y-0', remove='divide-y')
        else:
            self.list_container.classes(add='divide-y', remove='divide-y-0')

    def show_note(self, message):
        '''Shows a note label with the given message'''
        self.note_label.text = message
        self.note_label.set_visibility(True)

    def hide_note(self):
        '''Hides the note label'''
        self.note_label.set_visibility(False)

    def update_stats(self):
        '''Updates the stats'''
        self.devices_count = len(self.devices)

    def show_create_device_dialog(self):
        '''Shows the create device dialog'''
        with ui.dialog(value=True) as dialog, ui.card().classes('relative w-[696px] min-h-[500px]'):
            ui.button(icon="close", on_click=dialog.close).props(
                    "flat").classes("absolute top-6 right-6 px-2 text-black z-10")

            with ui.stepper().props('vertical') as stepper:
                with ui.step('基本信息'):
                    with ui.column():
                        ui.label(
                            '输入设备名称。该设备将使用此名称在 IoT Hub 中查找。')
                        name_input = ui.input('名称* (设备ID)')
                    with ui.stepper_navigation():
                        ui.button('取消', on_click=lambda: dialog.close()).props(
                            'flat')
                        ui.button('下一步', on_click=lambda: self.check_device_name_input(
                            stepper, name_input))
                with ui.step('传感器'):
                    sensors = Sensor.get_all_unassigned()

                    sensors_options = {
                        sensor.id: sensor.name for sensor in sensors}

                    if len(sensors) == 0:
                        ui.label(
                            "没有可用的空闲传感器。")
                    else:
                        ui.label(
                            "选择要分配给设备的传感器，可多选。")
                    sensors_input = ui.select(sensors_options, multiple=True, label='选择传感器').props(
                        'use-chips').classes('sm:w-64')

                    with ui.stepper_navigation():
                        ui.button('返回', on_click=stepper.previous).props(
                            'flat')
                        ui.button('创建', on_click=lambda: self.create_device(
                            dialog, name_input, sensors_input))

    def check_device_name_input(self, stepper, name_input):
        '''Checks the device name input'''
        if name_input.value == '':
            ui.notify('请输入名称',
                      type='negative')
            return
        else:
            # Check if name is already in use
            name = self.replace_special_characters(name_input.value)
            name_in_use = Device.check_if_name_in_use(name)
            
            if name_in_use:
                ui.notify('已存在同名设备', type='negative')
                return

        stepper.next()

    def create_device(self, dialog, name_input, sensors_input):
        '''Creates a new device'''
        dialog.close()
        name = name_input.value
        sensor_ids = sensors_input.value

        if len(self.devices) == 0:
            self.hide_note()

        device_id = self.replace_special_characters(name)

        new_device = None
        
        # Handle case when there is no IoT Hub connection configured
        if self.iot_hub_helper.registry_manager is None:
            ui.notify(f"设备 '{device_id}' 创建成功", type="positive")
            new_device = Device.add(sensor_ids=sensor_ids, device_name=device_id)
        
        # Create device in IoT Hub
        else:
            response = self.iot_hub_helper.create_device(device_id=device_id)
            
            if not response.success:
                ui.notify(response.message, type='negative')
                return
            else:
                ui.notify(response.message, type='positive')
                new_device = Device.add(sensor_ids=sensor_ids, device_client=response.object)

        if new_device is not None:
            self.devices.append(new_device)
            self.add_device_to_list(device=new_device)
            self.update_stats()

    def add_device_to_list(self, device):
        '''Adds a device to the list'''
        with self.list_container:
            new_item = DeviceItem(device=device,
                                  delete_callback=self.delete_button_handler)
            self.list_items.append(new_item)

    def delete_button_handler(self, device):
        '''Handles the delete button click. Opens a dialog to confirm the deletion of the device'''
        with ui.dialog(value=True) as dialog, ui.card().classes('items-center'):
            ui.label(
                f"确定要删除设备 '{device.name}' 吗?")
            with ui.row():
                ui.button('取消', on_click=dialog.close).props('flat')
                ui.button('删除', on_click=lambda d=dialog: self.delete_handler(
                    d, device)).classes('text-white bg-red')

    def delete_handler(self, dialog, device):
        '''Handles the deletion of a device. Deletes the device from the database and the IoT Hub and updates the list'''
        dialog.close()

        # Check if container is active
        if device.container_id is not None and device.container.is_active:
            ui.notify(f"容器 '{device.container.name}' 正在运行时无法删除", type="warning")
            return

        # Delete device from IoT Hub
        self.iot_hub_helper.delete_device(
            device_id=device.name, etag=device.etag)
        device.delete()

        # Delete device from list
        index = self.devices.index(device)
        self.list_container.remove(self.list_items[index].item)
        del self.devices[index]
        del self.list_items[index]

        ui.notify(
            f"设备 '{device.name}' 删除成功", type="positive")
        self.update_stats()

        if len(self.devices) == 0:
            self.show_note('暂无设备')

    def replace_special_characters(self, value):
        '''Replaces special characters not allowed in IoT Hub device names'''
        replacements = {
            ' ': '_',
            'Ä': 'AE',
            'Ö': 'OE',
            'Ü': 'UE',
            'ä': 'ae',
            'ö': 'oe',
            'ü': 'ue',
            'ß': 'ss'
        }

        for old_char, new_char in replacements.items():
            value = value.replace(old_char, new_char)

        return value
