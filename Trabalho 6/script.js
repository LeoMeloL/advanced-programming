const canvas = document.getElementById("gridCanvas");
const ctx = canvas.getContext("2d");
const btnRandom = document.getElementById("randomAgentsBtn");
const showPathsCheckbox = document.getElementById("showPathsCheckbox");
const btnExport = document.getElementById("exportDataBtn");

const gridSize = 20;
const cellSize = canvas.width / gridSize;

const colors = [
    "#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231",
    "#911eb4", "#46f0f0", "#f032e6", "#bcf60c", "#fabebe",
    "#008080", "#e6beff", "#9a6324", "#fffac8", "#800000",
    "#aaffc3", "#808000", "#ffd8b1", "#000075", "#808080"
];

class PointFactory {
    static create(x, y) {
        return { x, y };
    }
}

class Grid {
    constructor(size) {
        this.size = size;
        this.cells = Array(size)
            .fill(null)
            .map(() => Array(size).fill(0));
    }

    toggleWall(x, y) {
        this.cells[y][x] = this.cells[y][x] === 0 ? 1 : 0;
    }

    isFree(x, y) {
        return (
            x >= 0 &&
            y >= 0 &&
            x < this.size &&
            y < this.size &&
            this.cells[y][x] === 0
        );
    }
}

class Pathfinder {
    findPath(start, end, grid) {
        throw new Error("Error");
    }

    bfs(start, end, grid, dirs) {
        const queue = [[start]];
        const visited = new Set([`${start.x},${start.y}`]);

        const startTime = performance.now();
        let nodesVisited = 0;
        let maxQueueSize = 1;

        while (queue.length > 0) {
            maxQueueSize = Math.max(maxQueueSize, queue.length);
            const path = queue.shift();
            const { x, y } = path[path.length - 1];

            nodesVisited++;

            if (x === end.x && y === end.y) {
                const endTime = performance.now();

                bfsStats.push({
                    start,
                    end,
                    pathLength: path.length,
                    nodesVisited,
                    maxQueueSize,
                    timeMs: endTime - startTime,
                });

                return path;
            }

            for (const [dx, dy] of dirs) {
                const nx = x + dx;
                const ny = y + dy;

                if (grid.isFree(nx, ny) && !visited.has(`${nx},${ny}`)) {
                    visited.add(`${nx},${ny}`);
                    queue.push([...path, { x: nx, y: ny }]);
                }
            }
        }

        const endTime = performance.now();
        bfsStats.push({
            start,
            end,
            pathLength: 0,
            nodesVisited,
            maxQueueSize,
            timeMs: endTime - startTime,
        });

        return [start];
    }
}

class OrthogonalPathfinder extends Pathfinder {
    findPath(start, end, grid) {
        const dirs = [
            [1, 0], [-1, 0],
            [0, 1], [0, -1]
        ];

        return this.bfs(start, end, grid, dirs);
    }
}

class PathfinderFactory {
    static create(type) {
        if (type === "orthogonal") return new OrthogonalPathfinder();
        throw new Error("Tipo de pathfinder inválido: " + type);
    }
}

class Agent {
    constructor(origin, dest, path, color) {
        this.pos = { ...origin };
        this.dest = dest;
        this.path = path;
        this.step = 0;
        this.color = color;
    }

    update() {
        if (this.step < this.path.length - 1) {
            this.step++;
            this.pos = this.path[this.step];
        }
    }
}

class AgentFactory {
    constructor(pathfinder) {
        this.pathfinder = pathfinder;
        this.colorIndex = 0;
    }

    create(origin, dest, grid, colors) {
        const color = colors[this.colorIndex % colors.length];
        this.colorIndex++;

        const path = this.pathfinder.findPath(origin, dest, grid);

        return new Agent(origin, dest, path, color);
    }
}

let grid = new Grid(gridSize);
let agents = [];
let bfsStats = [];
let selectingOrigin = true;
let currentOrigin = null;

const pathfinder = PathfinderFactory.create("orthogonal");
const agentFactory = new AgentFactory(pathfinder);

function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < grid.size; y++) {
        for (let x = 0; x < grid.size; x++) {
            if (grid.cells[y][x] === 1) {
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
            ctx.strokeStyle = agent.color;
            ctx.lineWidth = 2;

            ctx.beginPath();

            const path = agent.path;
            if (path.length > 0) {
                ctx.moveTo(
                    path[0].x * cellSize + cellSize / 2,
                    path[0].y * cellSize + cellSize / 2
                );

                for (let i = 1; i < path.length; i++) {
                    ctx.lineTo(
                        path[i].x * cellSize + cellSize / 2,
                        path[i].y * cellSize + cellSize / 2
                    );
                }

                ctx.stroke();
            }
        }
    }

    for (const agent of agents) {
        ctx.fillStyle = agent.color;
        ctx.beginPath();
        ctx.arc(
            agent.pos.x * cellSize + cellSize / 2,
            agent.pos.y * cellSize + cellSize / 2,
            cellSize / 3,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }
}

function getGridCoords(event) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / cellSize);
    const y = Math.floor((event.clientY - rect.top) / cellSize);
    return { x, y };
}

canvas.addEventListener("click", (e) => {
    const { x, y } = getGridCoords(e);

    if (e.shiftKey) {
        grid.toggleWall(x, y);
        drawGrid();
        return;
    }

    if (selectingOrigin) {
        currentOrigin = PointFactory.create(x, y);
        selectingOrigin = false;
    } else {
        const dest = PointFactory.create(x, y);
        const agent = agentFactory.create(currentOrigin, dest, grid, colors);
        agents.push(agent);
        selectingOrigin = true;
    }

    drawGrid();
});

function updateAgents() {
    for (const agent of agents) {
        agent.update();
    }
}

function loop() {
    updateAgents();
    drawGrid();
    requestAnimationFrame(loop);
}

btnRandom.addEventListener("click", () => {
    for (let i = 0; i < 5; i++) {
        const origin = PointFactory.create(
            Math.random() * gridSize | 0,
            Math.random() * gridSize | 0
        );

        const dest = PointFactory.create(
            Math.random() * gridSize | 0,
            Math.random() * gridSize | 0
        );

        agents.push(agentFactory.create(origin, dest, grid, colors));
    }
});

btnExport.addEventListener("click", () => {
    const dataStr = "data:text/json;charset=utf-8," +
        encodeURIComponent(JSON.stringify(bfsStats, null, 2));

    const dl = document.createElement("a");
    dl.setAttribute("href", dataStr);
    dl.setAttribute("download", "bfs_stats.json");
    dl.click();
});

drawGrid();
loop();
