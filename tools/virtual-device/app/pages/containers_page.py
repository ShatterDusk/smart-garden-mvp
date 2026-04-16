from nicegui import ui
from components.navigation import Navigation
from components.container_card import ContainerCard
from components.live_view_dialog import LiveViewDialog
from model.container import Container
from model.device import Device


class ContainersPage:
    '''This class represents the containers page.'''

    def __init__(self, iot_hub_helper):
        self.iot_hub_helper = iot_hub_helper
        self.containers = Container.get_all()
        self.cards_grid = None
        self.cards = []
        self.update_stats()
        self.setup_layout()
        self.setup_menu_bar()
        self.setup_cards_grid()
        self.setup_live_view_dialog()

    def setup_layout(self):
        '''Sets up Navigation and updates page title'''
        Navigation()
        ui.query('main').classes('h-px')
        ui.query('.nicegui-content').classes('mx-auto max-w-screen-2xl p-8')
        ui.label("容器管理").classes('text-2xl font-bold')

    def setup_menu_bar(self):
        '''Sets up the menu bar'''
        with ui.row().classes('p-4 w-full flex items-center justify-between bg-gray-200 rounded-lg shadow-md'):
            # Create container button
            ui.button('创建新容器',
                      on_click=lambda: self.open_create_container_dialog()).classes('')

            # Container stats
            with ui.row():
                with ui.row().classes('gap-1'):
                    ui.label('总计:').classes('text-sm font-medium')
                    ui.label().classes('text-sm').bind_text(self, 'containers_count')
                with ui.row().classes('gap-1'):
                    ui.label('活跃:').classes('text-sm font-medium')
                    ui.label().classes('text-sm').bind_text(self, 'active_containers_count')
                with ui.row().classes('gap-1'):
                    ui.label('停止:').classes('text-sm font-medium')
                    ui.label().classes('text-sm').bind_text(self, 'inactive_containers_count')

            # Filter
            with ui.row():
                self.filter_input = ui.input(
                    placeholder='筛选', on_change=self.filter_handler).classes('w-44')
                self.filter_state_select = ui.select({1: "全部", 2: "活跃", 3: "停止"},
                          value=1, on_change=self.filter_handler).classes('w-24')

    def setup_cards_grid(self):
        '''Sets up the cards grid'''
        self.cards_grid = ui.grid().classes(
            'relative mt-6 w-full grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4')
        self.setup_note_label()

        if len(self.containers) == 0:
            self.show_note("暂无容器")
        else:
            with self.cards_grid:
                for container in self.containers:
                    new_container_card = ContainerCard(wrapper=self.cards_grid, container=container, start_callback=self.start_container,
                                                       stop_callback=self.stop_container, delete_callback=self.delete_container, live_view_callback=self.show_live_view_dialog)
                    self.cards.append(new_container_card)

    def setup_note_label(self):
        '''Sets up the note label, which is shown when no containers are available for instance'''
        with self.cards_grid:
            self.note_label = ui.label().classes(
                'absolute left-1/2 top-48 self-center -translate-x-1/2')
            self.note_label.set_visibility(False)

    def setup_live_view_dialog(self):
        '''Sets up the live view dialog. There is only one instance of the dialog, which is reused for every container.'''
        self.live_view_dialog = LiveViewDialog(self.cards_grid)

        for container in self.containers:
            container.live_view_dialog = self.live_view_dialog

    def update_stats(self):
        '''Updates the container stats'''
        self.containers_count = len(self.containers)
        self.active_containers_count = len(
            list(filter(lambda c: c.is_active, self.containers)))
        self.inactive_containers_count = self.containers_count - self.active_containers_count

    def filter_handler(self):
        '''Handles the filter input'''
        search_text = self.filter_input.value
        results = list(filter(lambda c: search_text.lower()
                       in c.container.name.lower(), self.cards))
        
        if self.filter_state_select.value > 1:
            is_active = self.filter_state_select.value == 2
            results = [container_card for container_card in results if container_card.container.is_active == is_active]

        for card in self.cards:
            card.visible = card in results

        if len(results) == 0:
            self.show_note("无匹配结果")
        else:
            self.hide_note()

    def show_note(self, message):
        '''Shows the note label with the given message'''
        self.cards_grid.classes('justify-center')
        self.note_label.text = message
        self.note_label.set_visibility(True)

    def hide_note(self):
        '''Hides the note label'''
        self.cards_grid.classes('justify-start')
        self.note_label.set_visibility(False)

    def open_create_container_dialog(self):
        '''Opens the create container dialog'''
        with ui.dialog(value=True) as dialog, ui.card().classes('w-[696px] min-h-[500px]'):
            ui.button(icon="close", on_click=dialog.close).props(
                "flat").classes("absolute top-6 right-6 px-2 text-black z-10")

            with ui.stepper().classes('w-full').props('vertical') as stepper:
                with ui.step('基本信息'):
                    with ui.column():
                        name_input = ui.input('名称*')
                        description_textarea = ui.textarea(
                            label='描述 (最多 255 字符)', validation={'最多 255 字符!': lambda value: len(value) < 256}).classes('w-full')
                        location_input = ui.input('位置').classes('w-full')
                    with ui.stepper_navigation():
                        ui.button('取消', on_click=lambda: dialog.close()).props(
                            'flat')
                        ui.button('下一步', on_click=lambda: self.check_container_general_input(
                            stepper, name_input, description_textarea))
                with ui.step('设备'):
                    devices = Device.get_all_unassigned()
                        
                    devices_options = {
                        device.id: device.name for device in devices}

                    if len(devices) == 0:
                        ui.label(
                            "没有可用的空闲设备。")
                    else:
                        ui.label(
                            "选择要分配给容器的设备，可多选。")
                    devices_input = ui.select(devices_options, multiple=True, label='选择设备').props(
                        'use-chips').classes('sm:w-64')

                    with ui.stepper_navigation():
                        ui.button('返回', on_click=stepper.previous).props(
                            'flat')
                        ui.button('创建', on_click=lambda: self.complete_container_creation(
                            dialog, name_input, description_textarea, location_input, devices_input))

    def check_container_general_input(self, stepper, name_input, description_textarea):
        '''Checks the general input of the create container dialog'''

        # Check if name is empty
        if name_input.value == '':
            ui.notify('请输入名称',
                      type='negative')
            return
        # Check if name is already in use
        else:
            name_in_use = Container.check_if_name_in_use(name_input.value)
            if name_in_use:
                ui.notify('已存在同名容器', type='negative')
                return
        
        # Check if description is too long
        if len(description_textarea.value) > 255:
            ui.notify('描述不能超过 255 字符',
                      type='negative')
            return

        stepper.next()

    def complete_container_creation(self, dialog, name_input, description_textarea, location_input, devices_input):
        '''Completes the container creation'''
        self.create_container(name_input.value, description_textarea.value,
                              location_input.value, devices_input.value)
        
        ui.notify('容器创建成功', type='positive')
        dialog.close()

    def create_container(self, name, description, location, device_ids):
        '''Creates a new container'''
        if len(self.containers) == 0:
            self.cards_grid.clear()
            self.note_label.set_visibility(False)

        new_container = Container.add(
            name, description, location, device_ids)
        new_container.live_view_dialog = self.live_view_dialog
        self.containers.append(new_container)
        with self.cards_grid:
            new_container_card = ContainerCard(wrapper=self.cards_grid, container=new_container, start_callback=self.start_container,
                                               stop_callback=self.stop_container, delete_callback=self.delete_container, live_view_callback=self.show_live_view_dialog)
            self.cards.append(new_container_card)
        self.update_stats()

    def start_container(self, container, interface):
        '''Starts the container simulation'''
        if len(container.devices) == 0:
            ui.notify("没有可用设备!", type="warning")
            return

        container.start(interface, success_callback=self.start_container_success_handler, iot_hub_helper=self.iot_hub_helper)

    def start_container_success_handler(self, container):
        '''Handles the success of the container start'''
        index = self.containers.index(container)
        self.cards[index].set_active()
        self.update_stats()

    def stop_container(self, container):
        '''Stops the container simulation'''
        container.stop()
        index = self.containers.index(container)
        self.cards[index].set_inactive()
        self.update_stats()

    def delete_container(self, container, dialog):
        '''Deletes the container'''
        if container.is_active:
            ui.notify(
                '容器正在运行，无法删除', type='warning')
            return

        container.delete()

        index = self.containers.index(container)
        self.cards_grid.remove(self.cards[index].card)
        del self.containers[index]
        del self.cards[index]

        ui.notify(
            f"容器 {container.name} 删除成功", type="positive")
        self.update_stats()
        dialog.close()

        if len(self.containers) == 0:
            self.show_note("暂无容器")

    def show_live_view_dialog(self, container):
        '''Shows the live view dialog'''
        if len(container.devices) == 0:
            ui.notify("没有可用设备!", type="warning")
            return

        self.live_view_dialog.show(container)
