# grid.py
import pygame
import math
from abc import ABC, abstractmethod
from core import SingletonMeta
from config import SCREEN_WIDTH, SCREEN_HEIGHT, CELL_SIZE, WHITE, BLACK, GRAY
from systems import PheromoneMap

class IGridAdapter(ABC):
    @abstractmethod
    def get_neighbors(self, node, grid_width, grid_height): pass
    @abstractmethod
    def pixel_to_grid(self, x, y): pass
    @abstractmethod
    def grid_to_pixel_center(self, col, row): pass
    @abstractmethod
    def draw_cell(self, surface, x, y, color, value): pass

class RectGridAdapter(IGridAdapter):
    def get_neighbors(self, node, w, h):
        x, y = node
        candidates = [(x+1, y), (x-1, y), (x, y+1), (x, y-1),
                      (x+1, y+1), (x-1, y-1), (x+1, y-1), (x-1, y+1)]
        valid = []
        for cx, cy in candidates:
            if 0 <= cx < w and 0 <= cy < h:
                valid.append((cx, cy))
        return valid

    def pixel_to_grid(self, px, py):
        return px // CELL_SIZE, py // CELL_SIZE

    def grid_to_pixel_center(self, col, row):
        cx = col * CELL_SIZE + CELL_SIZE // 2
        cy = row * CELL_SIZE + CELL_SIZE // 2
        return cx, cy

    def draw_cell(self, surface, x, y, color, value):
        rect = (x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE)
        pygame.draw.rect(surface, color, rect)
        pygame.draw.rect(surface, GRAY, rect, 1)

class HexGridAdapter(IGridAdapter):
    def get_neighbors(self, node, w, h):
        col, row = node
        even_dirs = [[1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [0, 1]]
        odd_dirs  = [[1, 1], [1, 0], [0, -1], [-1, 0], [-1, 1], [0, 1]]
        dirs = odd_dirs if row % 2 else even_dirs
        valid = []
        for d in dirs:
            nc, nr = col + d[0], row + d[1]
            if 0 <= nc < w and 0 <= nr < h:
                valid.append((nc, nr))
        return valid

    def pixel_to_grid(self, px, py):
        r_height = CELL_SIZE * 0.75
        row = int(py / r_height)
        offset = (row % 2) * (CELL_SIZE / 2)
        col = int((px - offset) / CELL_SIZE)
        return col, row

    def grid_to_pixel_center(self, col, row):
        r_height = CELL_SIZE * 0.75
        cx = col * CELL_SIZE + (CELL_SIZE / 2)
        cy = row * r_height + (CELL_SIZE / 2)
        if row % 2: cx += CELL_SIZE / 2
        return cx, cy

    def draw_cell(self, surface, col, row, color, value):
        cx, cy = self.grid_to_pixel_center(col, row)
        radius = CELL_SIZE / 2 + 2
        points = []
        for i in range(6):
            angle_deg = 60 * i - 30
            angle_rad = math.pi / 180 * angle_deg
            px = cx + radius * math.cos(angle_rad)
            py = cy + radius * math.sin(angle_rad)
            points.append((px, py))
        pygame.draw.polygon(surface, color, points)
        pygame.draw.polygon(surface, GRAY, points, 1)

class Grid(metaclass=SingletonMeta):
    def __init__(self):
        self.width = SCREEN_WIDTH // CELL_SIZE
        self.height = SCREEN_HEIGHT // CELL_SIZE
        self.cells = [[0 for _ in range(self.height)] for _ in range(self.width)]
        self.adapter = RectGridAdapter()
    
    def set_adapter(self, adapter_type):
        if adapter_type == 'rect': self.adapter = RectGridAdapter()
        elif adapter_type == 'hex': self.adapter = HexGridAdapter()
            
    def toggle_obstacle(self, x, y):
        if 0 <= x < self.width and 0 <= y < self.height:
            self.cells[x][y] = 1 if self.cells[x][y] == 0 else 0

    def is_blocked(self, node):
        x, y = node
        if not (0 <= x < self.width and 0 <= y < self.height): return True
        return self.cells[x][y] == 1

    def get_pixel_pos(self, grid_pos):
        return self.adapter.grid_to_pixel_center(grid_pos[0], grid_pos[1])

    def draw(self, surface):
        for x in range(self.width):
            for y in range(self.height):
                color = WHITE if self.cells[x][y] == 0 else BLACK
                # Pheromone visualization
                intensity = PheromoneMap().get_intensity((x,y))
                if intensity > 0 and self.cells[x][y] == 0:
                    val = min(255, int(intensity * 50))
                    color = (255, 255 - val, 255 - val)
                self.adapter.draw_cell(surface, x, y, color, self.cells[x][y])