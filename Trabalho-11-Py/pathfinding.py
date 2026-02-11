# pathfinding.py
import heapq
from core import SingletonMeta
from grid import Grid

class PathManager(metaclass=SingletonMeta):
    def find_path(self, start, end):
        grid = Grid()
        frontier = []
        heapq.heappush(frontier, (0, start))
        came_from = {start: None}
        cost_so_far = {start: 0}

        while frontier:
            _, current = heapq.heappop(frontier)
            if current == end: break

            neighbors = grid.adapter.get_neighbors(current, grid.width, grid.height)
            for next_node in neighbors:
                if grid.is_blocked(next_node): continue
                new_cost = cost_so_far[current] + 1
                if next_node not in cost_so_far or new_cost < cost_so_far[next_node]:
                    cost_so_far[next_node] = new_cost
                    priority = new_cost + self.heuristic(next_node, end)
                    heapq.heappush(frontier, (priority, next_node))
                    came_from[next_node] = current
        
        return self.reconstruct_path(came_from, start, end)

    def heuristic(self, a, b):
        return abs(a[0] - b[0]) + abs(a[1] - b[1])

    def reconstruct_path(self, came_from, start, end):
        if end not in came_from: return []
        current = end
        path = []
        while current != start:
            path.append(current)
            current = came_from[current]
        path.reverse()
        return path