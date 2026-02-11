# main.py
import pygame
import sys
import random
from config import SCREEN_WIDTH, SCREEN_HEIGHT, WHITE, BLUE, FPS, GameState
from core import InitHandler, EventManager
from grid import Grid
from pathfinding import PathManager
from systems import AgentRegistry, PheromoneMap, CommandHistory, MoveCommand
from agents import BaseAgent, ShieldedAgent, CollisionAvoidanceDecorator

class PygameInit(InitHandler):
    def process(self):
        pygame.init()
        pygame.display.set_caption("Modular Grid Nav System")

class SingletonsInit(InitHandler):
    def process(self):
        Grid()
        PathManager()
        AgentRegistry()
        CommandHistory()
        EventManager()
        PheromoneMap()

def generate_random_agents(count):
    grid = Grid()
    registry = AgentRegistry()
    registry.agents.clear()
    
    for i in range(count):
        sx, sy = random.randint(0, grid.width-1), random.randint(0, grid.height-1)
        ex, ey = random.randint(0, grid.width-1), random.randint(0, grid.height-1)
        
        base = BaseAgent((sx, sy))
        base.set_destination((ex, ey))
        agent = CollisionAvoidanceDecorator(base)

        if random.random() > 0.7:
            agent = ShieldedAgent(agent)
            agent.color = (255, 50, 50) # Red
            
        registry.deregister(agent.wrapped)
        registry.register(agent)

def main():
    InitHandler = PygameInit(SingletonsInit())
    InitHandler.handle()

    screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
    clock = pygame.time.Clock()
    grid = Grid()
    cmd_history = CommandHistory()
    registry = AgentRegistry()
    
    placing_origin = False
    origin_buffer = None
    
    running = True
    while running:
        screen.fill(WHITE)
        for event in pygame.event.get():
            if event.type == pygame.QUIT: running = False
            
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_z: cmd_history.undo_last_batch()
                if event.key == pygame.K_r: generate_random_agents(10)
                if event.key == pygame.K_h: grid.set_adapter('hex')
                if event.key == pygame.K_g: grid.set_adapter('rect')
                if event.key == pygame.K_p: GameState.SHOW_PATHS = not GameState.SHOW_PATHS
                
                # Strategies
                if event.key == pygame.K_1: GameState.CURRENT_STRATEGY_MODE = 1
                if event.key == pygame.K_2: GameState.CURRENT_STRATEGY_MODE = 2
                if event.key == pygame.K_3: GameState.CURRENT_STRATEGY_MODE = 3
                
                if event.key == pygame.K_SPACE:
                     batch_cmds = []
                     # Plan
                     for agent in registry.agents:
                         if agent.destination and not agent.path:
                             agent.recalculate_path()
                         next_node = agent.get_next_move()
                         if next_node:
                             batch_cmds.append(MoveCommand(agent, next_node))
                     # Execute
                     cmd_history.execute_batch(batch_cmds)
                     # Cleanup
                     PheromoneMap().decay()
                     for agent in registry.agents:
                         agent.advance_path()

            if event.type == pygame.MOUSEBUTTONDOWN:
                mx, my = pygame.mouse.get_pos()
                gx, gy = grid.adapter.pixel_to_grid(mx, my)
                if event.button == 1: grid.toggle_obstacle(gx, gy)
                elif event.button == 3:
                    if not placing_origin:
                        origin_buffer = (gx, gy)
                        placing_origin = True
                    else:
                        base = BaseAgent(origin_buffer)
                        base.set_destination((gx, gy))
                        agent = CollisionAvoidanceDecorator(base)
                        registry.deregister(base)
                        registry.register(agent)
                        placing_origin = False
                        origin_buffer = None

        grid.draw(screen)
        for agent in registry.agents:
            agent.render(screen)
            
        # UI
        font = pygame.font.SysFont("Arial", 18)
        modes = {1: "RVO (No Comm)", 2: "Indirect (Pheromone)", 3: "Direct (Negotiation)"}
        mode_str = modes.get(GameState.CURRENT_STRATEGY_MODE, "Unknown")
        
        info_txt = [
            f"Mode [1-3]: {mode_str}",
            "[R]: Spawn Agents", 
            "[Space]: Step", 
            "[P]: Toggle Path View"
        ]
        for i, text in enumerate(info_txt):
            screen.blit(font.render(text, True, BLUE), (5, 5 + i*20))

        pygame.display.flip()
        clock.tick(FPS)

    pygame.quit()
    sys.exit()

if __name__ == "__main__":
    main()