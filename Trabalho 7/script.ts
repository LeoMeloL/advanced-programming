interface Point {
    x: number;
    y: number;
}

interface PathfindingStat {
    start: Point;
    end: Point;
    pathLength: number;
    nodesVisited: number;
    timeMs: number;
}

const canvas = document.getElementById("gridCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const btnRandom = document.getElementById("randomAgentsBtn") as HTMLButtonElement;
const showPathsCheckbox = document.getElementById("showPathsCheckbox") as HTMLInputElement;

const gridSize = 20;
const cellSize = canvas.width / gridSize;
const colors: string[] = ["#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231"];

class GridManager {
    private static instance: GridManager;
    public cells: number[][];
    public size: number;

    private constructor(size: number) {
        this.size = size;
        this.cells = Array(size).fill(null).map(() => Array(size).fill(0));
    }

    public static getInstance(): GridManager {
        if (!GridManager.instance) {
            GridManager.instance = new GridManager(gridSize);
        }
        return GridManager.instance;
    }

    toggleWall(x: number, y: number): void {
        if (x >= 0 && y >= 0 && x < this.size && y < this.size) {
            this.cells[y][x] = this.cells[y][x] === 0 ? 1 : 0;
        }
    }

    isFree(x: number, y: number): boolean {
        return (
            x >= 0 && y >= 0 && x < this.size && y < this.size &&
            this.cells[y][x] === 0
        );
    }
}

interface IGridAdapter {
    getNeighbors(node: Point): Point[];
}

class RectangularAdapter implements IGridAdapter {
    private grid: GridManager;

    constructor() {
        this.grid = GridManager.getInstance();
    }

    getNeighbors(node: Point): Point[] {
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        const neighbors: Point[] = [];

        for (const [dx, dy] of dirs) {
            const nx = node.x + dx;
            const ny = node.y + dy;
            if (this.grid.isFree(nx, ny)) {
                neighbors.push({ x: nx, y: ny });
            }
        }
        return neighbors;
    }
}

class HexagonalAdapter implements IGridAdapter {
    private grid: GridManager;

    constructor() {
        this.grid = GridManager.getInstance();
    }

    getNeighbors(node: Point): Point[] {
        const isEvenRow = node.y % 2 === 0;
        const dirs = isEvenRow 
            ? [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]]
            : [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]];

        const neighbors: Point[] = [];

        for (const [dx, dy] of dirs) {
            const nx = node.x + dx;
            const ny = node.y + dy;
            if (this.grid.isFree(nx, ny)) {
                neighbors.push({ x: nx, y: ny });
            }
        }
        return neighbors;
    }
}

class BFSPathfinder {
    constructor(private adapter: IGridAdapter) {}

    findPath(start: Point, end: Point): Point[] {
        const queue: Point[][] = [[start]];
        const visited = new Set<string>([`${start.x},${start.y}`]);
        let nodesVisited = 0;
        const startTime = performance.now();

        while (queue.length > 0) {
            const path = queue.shift()!;
            const current = path[path.length - 1];
            nodesVisited++;

            if (current.x === end.x && current.y === end.y) {
                console.log(`Path found via BFS. Nodes: ${nodesVisited}`);
                return path;
            }

            const neighbors = this.adapter.getNeighbors(current);
            
            for (const n of neighbors) {
                const key = `${n.x},${n.y}`;
                if (!visited.has(key)) {
                    visited.add(key);
                    queue.push([...path, n]);
                }
            }
        }
        return [start];
    }
}

interface IAgent {
    update(): void;
    draw(ctx: CanvasRenderingContext2D): void;
    getPath(): Point[];
    getColor(): string;
    getPos(): Point;
}

class BaseAgent implements IAgent {
    pos: Point;
    path: Point[];
    step: number;
    color: string;

    constructor(path: Point[], color: string) {
        this.pos = path[0];
        this.path = path;
        this.step = 0;
        this.color = color;
    }

    update(): void {
        if (this.step < this.path.length - 1) {
            this.step++;
            this.pos = this.path[this.step];
        }
    }

    draw(ctx: CanvasRenderingContext2D): void {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(
            this.pos.x * cellSize + cellSize / 2,
            this.pos.y * cellSize + cellSize / 2,
            cellSize / 3,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }

    getPath() { return this.path; }
    getColor() { return this.color; }
    getPos() { return this.pos; }
}

abstract class AgentDecorator implements IAgent {
    protected wrappedAgent: IAgent;

    constructor(agent: IAgent) {
        this.wrappedAgent = agent;
    }

    update(): void {
        this.wrappedAgent.update();
    }

    draw(ctx: CanvasRenderingContext2D): void {
        this.wrappedAgent.draw(ctx);
    }

    getPath() { return this.wrappedAgent.getPath(); }
    getColor() { return this.wrappedAgent.getColor(); }
    getPos() { return this.wrappedAgent.getPos(); }
}

class TurboDecorator extends AgentDecorator {
    update(): void {
        this.wrappedAgent.update();
        this.wrappedAgent.update();
    }

    draw(ctx: CanvasRenderingContext2D): void {
        this.wrappedAgent.draw(ctx);
        const pos = this.wrappedAgent.getPos();
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(
            pos.x * cellSize + cellSize / 2,
            pos.y * cellSize + cellSize / 2,
            cellSize / 2.5,
            0,
            Math.PI * 2
        );
        ctx.stroke();
    }
}

const gridManager = GridManager.getInstance();

let agents: IAgent[] = [];
let selectingOrigin = true;
let currentOrigin: Point | null = null;

const currentAdapter = new RectangularAdapter(); 
const pathfinder = new BFSPathfinder(currentAdapter);

function draw(): void {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < gridManager.size; y++) {
        for (let x = 0; x < gridManager.size; x++) {
            if (gridManager.cells[y][x] === 1) {
                ctx.fillStyle = "#333";
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            } else {
                ctx.strokeStyle = "#ccc";
                ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
        }
    }

    if (showPathsCheckbox.checked) {
        for (const agent of agents) {
            ctx.strokeStyle = agent.getColor();
            ctx.lineWidth = 2;
            const path = agent.getPath();
            ctx.beginPath();
            if (path.length > 0) {
                ctx.moveTo(path[0].x * cellSize + cellSize / 2, path[0].y * cellSize + cellSize / 2);
                for (let i = 1; i < path.length; i++) {
                    ctx.lineTo(path[i].x * cellSize + cellSize / 2, path[i].y * cellSize + cellSize / 2);
                }
                ctx.stroke();
            }
        }
    }

    for (const agent of agents) {
        agent.draw(ctx);
    }
}

canvas.addEventListener("click", (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);

    if (e.shiftKey) {
        gridManager.toggleWall(x, y);
        draw();
        return;
    }

    if (selectingOrigin) {
        currentOrigin = { x, y };
        selectingOrigin = false;
    } else {
        if (currentOrigin) {
            const dest = { x, y };
            const path = pathfinder.findPath(currentOrigin, dest);

            let newAgent: IAgent = new BaseAgent(path, colors[agents.length % colors.length]);

            if (Math.random() > 0.5) {
                console.log("Criando agente com Turbo Decorator!");
                newAgent = new TurboDecorator(newAgent);
            }

            agents.push(newAgent);
            selectingOrigin = true;
        }
    }
    draw();
});

function loop(): void {
    for (const agent of agents) {
        agent.update();
    }
    draw();
    requestAnimationFrame(loop);
}

btnRandom.addEventListener("click", () => {
    for (let i = 0; i < 3; i++) {
        const o = { x: Math.floor(Math.random()*gridSize), y: Math.floor(Math.random()*gridSize) };
        const d = { x: Math.floor(Math.random()*gridSize), y: Math.floor(Math.random()*gridSize) };
        const path = pathfinder.findPath(o, d);
        
        let agent: IAgent = new BaseAgent(path, colors[Math.floor(Math.random() * colors.length)]);
        agent = new TurboDecorator(agent); 
        agents.push(agent);
    }
});

draw();
loop();