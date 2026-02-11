# agents.py
import pygame
from abc import ABC, abstractmethod
from core import EventManager
from grid import Grid
from pathfinding import PathManager
from systems import AgentRegistry, PheromoneMap
from config import BLUE, GREEN, YELLOW, RED, AGENT_RADIUS_PX, GameState
import strategies

class Agent(ABC):
    def __init__(self, start_pos):
        self.pos = start_pos
        self.path = []
        self.destination = None
        self.color = BLUE
        self.life = 100
        self.intended_next_pos = None 
        EventManager().subscribe(self)
        AgentRegistry().register(self)

    def set_destination(self, dest):
        self.destination = dest
        self.recalculate_path()

    def recalculate_path(self):
         if self.destination:
            self.path = PathManager().find_path(self.pos, self.destination)

    @abstractmethod
    def get_next_move(self): pass
    @abstractmethod
    def advance_path(self): pass

    def take_damage(self, amount):
        self.life -= amount
        if self.life <= 0:
            EventManager().notify("AGENT_DIED", self)

    def update_observer(self, event_type, data):
        if event_type == "AGENT_DIED" and data == self:
            self.life = 100
            self.pos = (0, 0)
            self.path = []
            self.destination = None

    @abstractmethod
    def render(self, surface): pass

class BaseAgent(Agent):
    def get_next_move(self):
        if self.path:
            return self.path[0]
        return None

    def advance_path(self):
        if self.path: self.path.pop(0)

    def render(self, surface):
        if GameState.SHOW_PATHS and self.path:
            grid = Grid()
            points = [grid.get_pixel_pos(self.pos)]
            for node in self.path:
                points.append(grid.get_pixel_pos(node))
            if len(points) > 1:
                pygame.draw.lines(surface, GREEN, False, points, 2)

        cx, cy = Grid().get_pixel_pos(self.pos)
        pygame.draw.circle(surface, self.color, (int(cx), int(cy)), AGENT_RADIUS_PX)

class AgentDecorator(Agent):
    def __init__(self, wrapped_agent):
        self.wrapped = wrapped_agent
    
    def __getattr__(self, name):
        return getattr(self.wrapped, name)
    def __setattr__(self, name, value):
        if name == 'wrapped': object.__setattr__(self, name, value)
        else: setattr(self.wrapped, name, value)
        
    def render(self, surface):
        self.wrapped.render(surface)
    
    def get_next_move(self):
        return self.wrapped.get_next_move()
    
    def advance_path(self):
        self.wrapped.advance_path()

class ShieldedAgent(AgentDecorator):
    def render(self, surface):
        self.wrapped.render(surface)
        cx, cy = Grid().get_pixel_pos(self.wrapped.pos)
        pygame.draw.circle(surface, YELLOW, (int(cx), int(cy)), AGENT_RADIUS_PX + 4, 2)

class CollisionAvoidanceDecorator(AgentDecorator):
    def get_next_move(self):
        base_next = self.wrapped.get_next_move()
        
        strategy = None
        if GameState.CURRENT_STRATEGY_MODE == 1:
            strategy = strategies.RVOStrategy_NoComm()
        elif GameState.CURRENT_STRATEGY_MODE == 2:
            strategy = strategies.IndirectCommStrategy()
        elif GameState.CURRENT_STRATEGY_MODE == 3:
            strategy = strategies.DirectCommStrategy()
            
        final_move = strategy.resolve_movement(self, base_next)
        
        self.wrapped.intended_next_pos = final_move
        
        if final_move:
            PheromoneMap().add_pheromone(final_move)
            
        return final_move

    def advance_path(self):
        base_next = self.wrapped.get_next_move()
        real_next = self.wrapped.intended_next_pos
        
        if base_next == real_next and real_next is not None:
             self.wrapped.advance_path()
        elif real_next != self.pos:
            self.wrapped.path = []