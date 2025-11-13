const canvas = document.getElementById("gridCanvas");
const ctx = canvas.getContext("2d");
const btnRandom = document.getElementById("randomAgentsBtn");
const showPathsCheckbox = document.getElementById("showPathsCheckbox");
const btnExport = document.getElementById("exportDataBtn");

const gridSize = 20;
const cellSize = canvas.width / gridSize;

let grid = [];
let agents = [];
let bfsStats = [];
let selectingOrigin = true;
let currentOrigin = null;

const colors = [
    "#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231",
    "#911eb4", "#46f0f0", "#f032e6", "#bcf60c", "#fabebe",
    "#008080", "#e6beff", "#9a6324", "#fffac8", "#800000",
    "#aaffc3", "#808000", "#ffd8b1", "#000075", "#808080"
];

function createGrid() {
    grid = new Array(gridSize)
        .fill(null)
        .map(() => new Array(gridSize).fill(0));
}

function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            if (grid[y][x] === 1) {
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
        grid[y][x] = grid[y][x] === 0 ? 1 : 0;
        drawGrid();
        return;
    }

    if (selectingOrigin) {
        currentOrigin = { x, y };
        selectingOrigin = false;
    } else {
        const dest = { x, y };
        addAgent(currentOrigin, dest);
        selectingOrigin = true;
    }

    drawGrid();
});

function addAgent(origin, dest) {
    const color = colors[agents.length % colors.length];
    agents.push({
        pos: { ...origin },
        dest,
        path: findPath(origin, dest),
        step: 0,
        color
    });
}

function findPath(start, end) {
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
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
                timeMs: endTime - startTime
            });

            return path;
        }

        for (const [dx, dy] of dirs) {
            const nx = x + dx, ny = y + dy;
            if (
                nx >= 0 && nx < gridSize &&
                ny >= 0 && ny < gridSize &&
                grid[ny][nx] === 0 &&
                !visited.has(`${nx},${ny}`)
            ) {
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
        timeMs: endTime - startTime
    });

    return [start];
}

function updateAgents() {
    for (const agent of agents) {
        if (agent.step < agent.path.length - 1) {
            agent.step++;
            agent.pos = agent.path[agent.step];
        }
    }
}

function exportStats() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(bfsStats, null, 2));
    const dlAnchor = document.createElement("a");
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", "bfs_stats.json");
    dlAnchor.click();
}

btnExport.addEventListener("click", () => {
    exportStats();
});


btnRandom.addEventListener("click", () => {
    for (let i = 0; i < 5; i++) {
        const origin = {
            x: Math.floor(Math.random() * gridSize),
            y: Math.floor(Math.random() * gridSize)
        };
        const dest = {
            x: Math.floor(Math.random() * gridSize),
            y: Math.floor(Math.random() * gridSize)
        };
        addAgent(origin, dest);
    }
});

function loop() {
    updateAgents();
    drawGrid();
    requestAnimationFrame(loop);
}

createGrid();
drawGrid();
loop();
