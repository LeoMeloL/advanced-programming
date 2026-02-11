# systems.py
from core import SingletonMeta, ICommand

class AgentRegistry(metaclass=SingletonMeta):
    def __init__(self):
        self.agents = []

    def register(self, agent):
        if agent not in self.agents:
            self.agents.append(agent)
            
    def deregister(self, agent):
        if agent in self.agents:
            self.agents.remove(agent)

    def get_all_except(self, ignored_agent):
        return [a for a in self.agents if a is not ignored_agent]

    def is_occupied(self, grid_pos, ignore_agent=None):
        """Checks if a cell is currently occupied by any agent."""
        for agent in self.agents:
            if agent is ignore_agent:
                continue
            if agent.pos == grid_pos:
                return True
        return False

class PheromoneMap(metaclass=SingletonMeta):
    def __init__(self):
        self.heatmap = {} 
        self.decay_rate = 0.5

    def add_pheromone(self, grid_pos, intensity=1.0):
        if grid_pos not in self.heatmap:
            self.heatmap[grid_pos] = 0.0
        self.heatmap[grid_pos] += intensity

    def get_intensity(self, grid_pos):
        return self.heatmap.get(grid_pos, 0.0)

    def decay(self):
        for k in list(self.heatmap.keys()):
            self.heatmap[k] -= self.decay_rate
            if self.heatmap[k] <= 0:
                del self.heatmap[k]

class CommandHistory(metaclass=SingletonMeta):
    def __init__(self):
        self.history = []

    def execute_batch(self, commands):
        if not commands: return
        valid_commands = []

        occupied_next = set()

        moving_agents = {cmd.agent for cmd in commands}
        registry = AgentRegistry()
        
        for agent in registry.agents:
            if agent not in moving_agents:
                occupied_next.add(agent.pos)

        for cmd in commands:
            if cmd.new_pos not in occupied_next:
                 cmd.execute()
                 valid_commands.append(cmd)
                 occupied_next.add(cmd.new_pos)
            else:
                pass
        
        if valid_commands:
             self.history.append(valid_commands)

    def undo_last_batch(self):
        if self.history:
            batch = self.history.pop()
            for cmd in reversed(batch):
                cmd.undo()

class MoveCommand(ICommand):
    def __init__(self, agent, new_pos):
        self.agent = agent
        self.new_pos = new_pos
        self.old_pos = agent.pos

    def execute(self):
        self.agent.pos = self.new_pos

    def undo(self):
        self.agent.pos = self.old_pos