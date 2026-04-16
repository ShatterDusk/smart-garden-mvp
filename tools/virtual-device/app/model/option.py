from model.models import OptionModel


class Option(OptionModel):
    '''This class represents an option. Options are used to store global settings.'''

    @staticmethod
    def _get_option(name):
        '''Returns the option with the given name'''
        return Option.session.query(OptionModel).filter_by(name=name).first()
    
    @staticmethod
    def get_value(name):
        '''Returns the value of the option with the given name'''
        option = Option._get_option(name)
        if option is not None:
            return option.value
        return None
    
    @staticmethod
    def get_boolean(name):
        '''Returns the boolean value of the option with the given name'''
        value = Option.get_value(name)
        if value is None:
            return False
        return value == "1"

    @staticmethod
    def set_value(name, value):
        '''Sets value of existing option or creates a new option with the given name'''
        option = Option._get_option(name)
        if option is None:
            option = Option(name=name, value=value)
            Option.session.add(option)
        else:
            option.value = value
        Option.session.commit()
        return option
    

