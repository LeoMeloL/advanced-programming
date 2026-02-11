# core.py
from abc import ABC, abstractmethod

class SingletonMeta(type):
    _instances = {}
    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]

class EventManager(metaclass=SingletonMeta):
    def __init__(self):
        self._subscribers = []

    def subscribe(self, observer):
        self._subscribers.append(observer)

    def notify(self, event_type, data):
        for sub in self._subscribers:
            sub.update_observer(event_type, data)

class InitHandler(ABC):
    def __init__(self, next_handler=None):
        self._next = next_handler
    
    def handle(self):
        self.process()
        if self._next:
            self._next.handle()

    @abstractmethod
    def process(self): pass

class ICommand(ABC):
    @abstractmethod
    def execute(self): pass
    @abstractmethod
    def undo(self): pass