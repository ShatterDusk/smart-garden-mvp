from model.models import SensorModel
from utils.simulator import Simulator
import threading


class Sensor(SensorModel):
    '''This class represents a sensor.'''

    @staticmethod
    def add(name, base_value, unit, variation_range, change_rate, interval, error_definition, device_id):
        '''Adds a new sensor to the database'''
        new_sensor = Sensor(name=name, base_value=base_value,
                            unit=unit, variation_range=variation_range, change_rate=change_rate, interval=interval, error_definition=error_definition, device_id=device_id)

        Sensor.session.add(new_sensor)
        Sensor.session.commit()

        return new_sensor

    @staticmethod
    def get_all():
        '''Returns all sensors'''
        return Sensor.session.query(Sensor).all()

    @staticmethod
    def get_all_by_ids(list_of_ids):
        '''Returns all sensors with the given ids'''
        return Sensor.session.query(Sensor).filter(Sensor.id.in_(list_of_ids)).all()
    
    @staticmethod
    def get_by_id(id):
        '''Returns a sensor by its id'''
        return Sensor.session.query(Sensor).filter(Sensor.id == id).first()

    @staticmethod
    def get_all_unassigned():
        '''Returns all sensors that are not assigned to a device'''
        return Sensor.session.query(Sensor).filter(Sensor.device_id == None).all()
    
    @staticmethod
    def check_if_name_in_use(name):
        return Sensor.session.query(Sensor).filter(Sensor.name.ilike(name)).first() is not None
    
    def start_simulation(self, callback):
        '''Starts the simulation'''
        self.simulator = Simulator(sensor=self)
        self.running = True

        timer = threading.Timer(interval=self.interval, function=self._callback, args=[callback])
        timer.start()

    def _callback(self, device_callback):
        '''Callback function for the simulation'''

        # Check if simulation is still running
        if self.running:
            data = self.simulator.generate_data()
            device_callback(self, data)

            # Repeat callback after interval
            timer = threading.Timer(
                interval=self.interval, function=self._callback, args=[device_callback])
            timer.start()

    def stop_simulation(self):
        '''Stops the simulation'''
        self.running = False

    def start_bulk_simulation(self, amount):
        '''Starts a bulk simulation and returns the generated data'''
        simulator = Simulator(sensor=self)
        data = simulator.generate_bulk_data(amount)
        return data

    def delete(self):
        '''Deletes the sensor'''
        Sensor.session.delete(self)
        Sensor.session.commit()
