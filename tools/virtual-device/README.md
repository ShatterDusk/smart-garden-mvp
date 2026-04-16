# IoT Sensor Data Simulator

## Overview
This repository contains the source code for an Internet of Things (IoT) sensor data simulator. The simulator was developed as part of a Bachelor's thesis project, and it aims to generate and send synthetic sensor data for testing and development purposes in IoT projects.

IoT systems often involve many sensors, generating vast amounts of data that needs to be processed, analyzed, and stored efficiently. Developing and testing such systems in a real-world environment can be costly and time-consuming. This simulator provides a solution by generating synthetic sensor data, enabling developers to test their systems more efficiently.

## Features
- Generates synthetic IoT sensor data that reflects typical characteristics of IoT sensor data.
- Simulates various error states, providing a realistic environment for testing IoT systems.
- Sends the generated data to specified endpoints, such as an Microsoft Azure IoT hub or MQTT broker.
- Exports generated data into various file formats (CSV, XLSX, JSON).
- Provides a graphical user interface implemented with NiceGUI.

## Installation

Before you begin, ensure that you have at least Python 3.7 installed on your system. If you don't have Python installed, you can download it from the official website [here](https://www.python.org/downloads/).

Additionally, make sure you have the package manager `pip` installed. `pip` usually comes pre-installed with Python versions 2.7.9+ or 3.4+.

Once you've verified your Python and pip installations, clone the repository to your local machine:

```python
git clone https://github.com/antonsarg/iot-sensor-data-simulator
```

Navigate to the project directory:

```python
cd iot-sensor-data-simulator
```

Install the dependencies:

```python
pip install -r requirements.txt
```

## Usage

**Note:** Before running the simulator, if you plan to establish a connection to IoT Hub or MQTT, please refer to the sections 'Sending Data to Azure IoT Hub' and 'Sending Data to MQTT Broker' below.

Run the simulator:

```python
python app/main.py
```

You can then access the simulator's user interface in your web browser at `http://localhost:8080`.

### Sending Data to Azure IoT Hub

To send data to the Azure IoT Hub, an `.env` file must be created in the project root containing the following environment variables:

```python
IOT_HUB_CONNECTION_STRING=YourConnectionStringHere
IOT_HUB_PRIMARY_KEY=YourPrimaryKeyHere
IOT_HUB_SECONDARY_KEY=YourSecondaryKeyHere
```

You can take the values from your IoT Hub. These values are used to establish a connection to the IoT Hub and are not required for running the application without IoT Hub connectivity. Remember to restart the application if you have made any changes during the execution.

### Sending Data to MQTT Broker

The software also supports sending data to an MQTT broker. Similarly, the `.env` file should contain the broker's address and port number:

```python
MQTT_BROKER_ADDRESS=YourBrokerAddressHere
MQTT_BROKER_PORT=YourBrokerPortHere
```

For brokers requiring authentication, you can provide a username and password:

```python
MQTT_BROKER_USERNAME=YourUsernameHere
MQTT_BROKER_PASSWORD=YourPasswordHere
```

Again, these details are optional and are not necessary to run the application without MQTT broker connectivity. Remember to restart the application if you made any changes during execution.

## Contribution

If you find any bugs or have a feature request, please open an issue on GitHub. I welcome any contributions, whether it's improving the documentation, fixing bugs, or implementing new features.

## Diagrams

Some parts of the code and design of the project are described in more detail by diagrams, which can be found in the `diagrams` folder in the project directory. These diagrams were created using [draw.io](https://www.drawio.com/).

To open and edit these diagrams you can use their [web application](https://app.diagrams.net/). Another way to view and modify the diagrams is to download and install the unofficial Visual Studio Code extension for draw.io from this [link](https://marketplace.visualstudio.com/items?itemName=hediet.vscode-drawio).

## License

This project is licensed under the terms of the [MIT](https://choosealicense.com/licenses/mit/) - see the [LICENSE](LICENSE.txt) file for details.
