from azure.iot.device import IoTHubDeviceClient, Message
from azure.iot.hub import IoTHubRegistryManager
from model.option import Option
from utils.response import Response
import re
import os
import json


class IoTHubHelper:

    def __init__(self):
        '''Initializes the IoT Hub helper.'''
        self.setup_registry_manager()

    def setup_registry_manager(self):
        '''Sets up the registry manager for the IoT Hub.'''
        self.registry_manager = None
        connection_string = os.getenv("IOT_HUB_CONNECTION_STRING")
        
        if connection_string is not None:
            self.registry_manager = IoTHubRegistryManager(connection_string) # throws error: Error in sys.excepthook:

    def create_device(self, device_id):
        '''Creates a device in the IoT Hub.'''
        if self.registry_manager is None:
            return None

        primary_key = os.getenv("IOT_HUB_PRIMARY_KEY")
        secondary_key = os.getenv("IOT_HUB_SECONDARY_KEY")
        status = "enabled"
        
        try:
            device = self.registry_manager.create_device_with_sas(device_id, primary_key, secondary_key, status)
            return Response(True, f"Gerät '{device_id}' erfolgreich erstellt", device)
        except Exception as e:
            return Response(False, "Fehler beim Erstellen: {}".format(e))

    def delete_device(self, device_id, etag=None):
        '''Deletes a device from the IoT Hub.'''
        try:
            self.registry_manager.delete_device(device_id, etag=etag)
        except Exception as e:
            return Response(False, "Fehler beim Löschen: {}".format(e))
        
        return Response(True, f"Gerät '{device_id}' erfolgreich gelöscht")


    def init_device_client(self, connection_string):
        '''Initializes the device client from a connection string.'''
        device_client = IoTHubDeviceClient.create_from_connection_string(connection_string)
        device_client.connect()
        return device_client
    
    def send_message(self, device_client, data):
        '''Sends a message to the IoT Hub.'''

        # Prevent sending messages in demo mode
        is_demo_mode = Option.get_boolean('demo_mode')
        if is_demo_mode:
            return Response(False, "Demo-Modus aktiviert. Nachrichten werden nicht gesendet.")

        # Prevent manipulation of original data used in other places
        data_copy = data.copy()
        
        # Convert datetime to ISO format
        data_copy["timestamp"] = data_copy["timestamp"].isoformat()

        # Remove sendDuplicate flag
        send_duplicate = data_copy.get("sendDuplicate", False)
        data_copy.pop("sendDuplicate", None)

        # Send message
        try:
            # Convert the dictionary to JSON string
            json_data = json.dumps(data_copy)
            message = Message(json_data)
            
            for _ in range(1 if not send_duplicate else 2):
                print("Sending message: {}".format(message))
                device_client.send_message(message)
        except Exception as e:
            return Response(False, "Fehler beim Senden: {}".format(e))
        else:
            return Response(True, "Nachricht erfolgreich gesendet")

    @staticmethod
    def get_host_name():
        '''Returns the host name of the IoT Hub from the connection string.'''
        try:
            connection_string = os.getenv("IOT_HUB_CONNECTION_STRING")
            host_name = re.search('HostName=(.+?).azure-devices.net', connection_string).group(1)
        except AttributeError:
            host_name = None
        except TypeError:
            host_name = None
        
        return host_name