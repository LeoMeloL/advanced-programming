# strategies.py
import math
import random
from abc import ABC, abstractmethod
from grid import Grid
from systems import AgentRegistry, PheromoneMap
from pathfinding import PathManager
from config import DETECTION_RADIUS_PX, AGENT_RADIUS_PX

class IAvoidanceStrategy(ABC):
    @abstractmethod
    def resolve_movement(self, agent, preferred_next): pass

class RVOStrategy_NoComm(IAvoidanceStrategy):
    def resolve_movement(self, agent, preferred_next):
        grid = Grid()
        registry = AgentRegistry()
        my_px = grid.get_pixel_pos(agent.pos)

        if preferred_next:
            target_px = grid.get_pixel_pos(preferred_next)
            v_pref = (target_px[0] - my_px[0], target_px[1] - my_px[1])
        else:
            v_pref = (0, 0)

        threats = []
        for other in registry.get_all_except(agent):
            other_px = grid.get_pixel_pos(other.pos)
            dist = math.hypot(my_px[0] - other_px[0], my_px[1] - other_px[1])
            
            if dist < DETECTION_RADIUS_PX:
                if other.path:
                    other_next_px = grid.get_pixel_pos(other.path[0])
                    v_other = (other_next_px[0] - other_px[0], other_next_px[1] - other_px[1])
                else:
                    v_other = (0, 0)
                threats.append((other_px, v_other, dist))

        if not threats:
            return preferred_next

        neighbors = grid.adapter.get_neighbors(agent.pos, grid.width, grid.height)
        neighbors.append(agent.pos)
        
        best_score = -float('inf')
        best_node = agent.pos

        for cand_node in neighbors:
            if grid.is_blocked(cand_node): continue
            if registry.is_occupied(cand_node, ignore_agent=agent): continue
            
            cand_px = grid.get_pixel_pos(cand_node)
            v_cand = (cand_px[0] - my_px[0], cand_px[1] - my_px[1])

            dot = v_cand[0]*v_pref[0] + v_cand[1]*v_pref[1]
            score = dot * 1.0
            
            for (obs_pos, obs_vel, dist) in threats:
                v_rel = (v_cand[0] - obs_vel[0], v_cand[1] - obs_vel[1])
                p_rel = (cand_px[0] - obs_pos[0], cand_px[1] - obs_pos[1])
                dist_future = math.hypot(p_rel[0], p_rel[1])

                if dist_future < AGENT_RADIUS_PX * 2.1:
                    score -= 10000
                else:
                    score -= (500 / (dist_future + 0.1))

            score += random.uniform(0, 5.0)

            if score > best_score:
                best_score = score
                best_node = cand_node
                
        return best_node

class IndirectCommStrategy(IAvoidanceStrategy):
    def resolve_movement(self, agent, preferred_next):
        grid = Grid()
        phero_map = PheromoneMap()
        registry = AgentRegistry()

        physically_blocked = registry.is_occupied(preferred_next, ignore_agent=agent) if preferred_next else False
        
        curr_intensity = phero_map.get_intensity(preferred_next) if preferred_next else 0

        if curr_intensity > 2.0 or physically_blocked:
            neighbors = grid.adapter.get_neighbors(agent.pos, grid.width, grid.height)
            best_n = agent.pos
            min_cost = float('inf')

            candidates = neighbors + [agent.pos]

            for n in candidates:

                if registry.is_occupied(n, ignore_agent=agent): 
                    continue

                p = phero_map.get_intensity(n)
                h = PathManager().heuristic(n, agent.destination) if agent.destination else 0

                cost = (p * 10) + h

                cost += random.uniform(0, 0.5)
                
                if cost < min_cost:
                    min_cost = cost
                    best_n = n
            return best_n
            
        return preferred_next

class DirectCommStrategy(IAvoidanceStrategy):
    def resolve_movement(self, agent, preferred_next):
        if not preferred_next: return agent.pos
        
        registry = AgentRegistry()
        grid = Grid()

        target_occupied_by = None
        for other in registry.get_all_except(agent):
            if other.pos == preferred_next:
                target_occupied_by = other
                break

        conflict = False

        if target_occupied_by:

             if target_occupied_by.intended_next_pos == agent.pos:
                 conflict = True
             elif target_occupied_by.intended_next_pos == preferred_next:
                 conflict = True

             else:
                 conflict = True 

        if not conflict:
            for other in registry.get_all_except(agent):
                my_px = grid.get_pixel_pos(agent.pos)
                ot_px = grid.get_pixel_pos(other.pos)
                if math.hypot(my_px[0]-ot_px[0], my_px[1]-ot_px[1]) > DETECTION_RADIUS_PX:
                    continue
                    
                if other.intended_next_pos == preferred_next:
                    if id(agent) < id(other): # Lower ID yields
                        conflict = True
                        break
                
        if conflict:
            neighbors = grid.adapter.get_neighbors(agent.pos, grid.width, grid.height)
            valid_escape = []
            for n in neighbors:
                if not grid.is_blocked(n) and not registry.is_occupied(n, ignore_agent=agent):
                     valid_escape.append(n)
            
            if valid_escape:
              
                return random.choice(valid_escape)
            else:
                return agent.pos 
            
        return preferred_next