var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
// --- Configurações Globais ---
var canvas = document.getElementById("gridCanvas");
var ctx = canvas.getContext("2d");
var btnRandom = document.getElementById("randomAgentsBtn");
var showPathsCheckbox = document.getElementById("showPathsCheckbox");
var gridSize = 20;
var cellSize = canvas.width / gridSize;
var colors = ["#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231"];
// ==========================================================
// 1. SINGLETON: Gerencia a única instância do Grid
// ==========================================================
var GridManager = /** @class */ (function () {
    function GridManager(size) {
        this.size = size;
        this.cells = Array(size).fill(null).map(function () { return Array(size).fill(0); });
    }
    GridManager.getInstance = function () {
        if (!GridManager.instance) {
            GridManager.instance = new GridManager(gridSize);
        }
        return GridManager.instance;
    };
    GridManager.prototype.toggleWall = function (x, y) {
        if (x >= 0 && y >= 0 && x < this.size && y < this.size) {
            this.cells[y][x] = this.cells[y][x] === 0 ? 1 : 0;
        }
    };
    GridManager.prototype.isFree = function (x, y) {
        return (x >= 0 && y >= 0 && x < this.size && y < this.size &&
            this.cells[y][x] === 0);
    };
    return GridManager;
}());
var RectangularAdapter = /** @class */ (function () {
    function RectangularAdapter() {
        this.grid = GridManager.getInstance();
    }
    RectangularAdapter.prototype.getNeighbors = function (node) {
        var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        var neighbors = [];
        for (var _i = 0, dirs_1 = dirs; _i < dirs_1.length; _i++) {
            var _a = dirs_1[_i], dx = _a[0], dy = _a[1];
            var nx = node.x + dx;
            var ny = node.y + dy;
            if (this.grid.isFree(nx, ny)) {
                neighbors.push({ x: nx, y: ny });
            }
        }
        return neighbors;
    };
    return RectangularAdapter;
}());
// Simula vizinhos hexagonais em uma matriz 2D (offset coordinates)
var HexagonalAdapter = /** @class */ (function () {
    function HexagonalAdapter() {
        this.grid = GridManager.getInstance();
    }
    HexagonalAdapter.prototype.getNeighbors = function (node) {
        var isEvenRow = node.y % 2 === 0;
        // Lógica de vizinhança para grids hexagonais "odd-r"
        var dirs = isEvenRow
            ? [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]]
            : [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]];
        var neighbors = [];
        for (var _i = 0, dirs_2 = dirs; _i < dirs_2.length; _i++) {
            var _a = dirs_2[_i], dx = _a[0], dy = _a[1];
            var nx = node.x + dx;
            var ny = node.y + dy;
            if (this.grid.isFree(nx, ny)) {
                neighbors.push({ x: nx, y: ny });
            }
        }
        return neighbors;
    };
    return HexagonalAdapter;
}());
// --- Pathfinder (Agora usa o Adapter) ---
var BFSPathfinder = /** @class */ (function () {
    function BFSPathfinder(adapter) {
        this.adapter = adapter;
    }
    BFSPathfinder.prototype.findPath = function (start, end) {
        var queue = [[start]];
        var visited = new Set(["".concat(start.x, ",").concat(start.y)]);
        var nodesVisited = 0;
        var startTime = performance.now();
        while (queue.length > 0) {
            var path = queue.shift();
            var current = path[path.length - 1];
            nodesVisited++;
            if (current.x === end.x && current.y === end.y) {
                console.log("Path found via BFS. Nodes: ".concat(nodesVisited));
                return path;
            }
            // O Pathfinder não sabe se é Hex ou Rect, ele só pede vizinhos ao Adapter
            var neighbors = this.adapter.getNeighbors(current);
            for (var _i = 0, neighbors_1 = neighbors; _i < neighbors_1.length; _i++) {
                var n = neighbors_1[_i];
                var key = "".concat(n.x, ",").concat(n.y);
                if (!visited.has(key)) {
                    visited.add(key);
                    queue.push(__spreadArray(__spreadArray([], path, true), [n], false));
                }
            }
        }
        return [start];
    };
    return BFSPathfinder;
}());
// Agente Concreto
var BaseAgent = /** @class */ (function () {
    function BaseAgent(path, color) {
        this.pos = path[0];
        this.path = path;
        this.step = 0;
        this.color = color;
    }
    BaseAgent.prototype.update = function () {
        if (this.step < this.path.length - 1) {
            this.step++;
            this.pos = this.path[this.step];
        }
    };
    BaseAgent.prototype.draw = function (ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.pos.x * cellSize + cellSize / 2, this.pos.y * cellSize + cellSize / 2, cellSize / 3, 0, Math.PI * 2);
        ctx.fill();
    };
    BaseAgent.prototype.getPath = function () { return this.path; };
    BaseAgent.prototype.getColor = function () { return this.color; };
    BaseAgent.prototype.getPos = function () { return this.pos; };
    return BaseAgent;
}());
// Classe Base do Decorator
var AgentDecorator = /** @class */ (function () {
    function AgentDecorator(agent) {
        this.wrappedAgent = agent;
    }
    AgentDecorator.prototype.update = function () {
        this.wrappedAgent.update();
    };
    AgentDecorator.prototype.draw = function (ctx) {
        this.wrappedAgent.draw(ctx);
    };
    AgentDecorator.prototype.getPath = function () { return this.wrappedAgent.getPath(); };
    AgentDecorator.prototype.getColor = function () { return this.wrappedAgent.getColor(); };
    AgentDecorator.prototype.getPos = function () { return this.wrappedAgent.getPos(); };
    return AgentDecorator;
}());
// Decorator Concreto: Agente Turbo (Move 2 passos por vez)
var TurboDecorator = /** @class */ (function (_super) {
    __extends(TurboDecorator, _super);
    function TurboDecorator() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    TurboDecorator.prototype.update = function () {
        // Executa update duas vezes para dobrar a velocidade
        this.wrappedAgent.update();
        this.wrappedAgent.update();
    };
    TurboDecorator.prototype.draw = function (ctx) {
        // Desenha um anel extra para indicar que é Turbo
        this.wrappedAgent.draw(ctx);
        var pos = this.wrappedAgent.getPos();
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pos.x * cellSize + cellSize / 2, pos.y * cellSize + cellSize / 2, cellSize / 2.5, 0, Math.PI * 2);
        ctx.stroke();
    };
    return TurboDecorator;
}(AgentDecorator));
// --- Lógica Principal ---
// Uso do Singleton
var gridManager = GridManager.getInstance();
var agents = [];
var selectingOrigin = true;
var currentOrigin = null;
// Uso do Adapter (Pode trocar para new HexagonalAdapter() facilmente)
var currentAdapter = new RectangularAdapter();
var pathfinder = new BFSPathfinder(currentAdapter);
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Desenha Grid
    for (var y = 0; y < gridManager.size; y++) {
        for (var x = 0; x < gridManager.size; x++) {
            if (gridManager.cells[y][x] === 1) {
                ctx.fillStyle = "#333";
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
            else {
                ctx.strokeStyle = "#ccc";
                ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
        }
    }
    // Desenha Caminhos
    if (showPathsCheckbox.checked) {
        for (var _i = 0, agents_1 = agents; _i < agents_1.length; _i++) {
            var agent = agents_1[_i];
            ctx.strokeStyle = agent.getColor();
            ctx.lineWidth = 2;
            var path = agent.getPath();
            ctx.beginPath();
            if (path.length > 0) {
                ctx.moveTo(path[0].x * cellSize + cellSize / 2, path[0].y * cellSize + cellSize / 2);
                for (var i = 1; i < path.length; i++) {
                    ctx.lineTo(path[i].x * cellSize + cellSize / 2, path[i].y * cellSize + cellSize / 2);
                }
                ctx.stroke();
            }
        }
    }
    // Desenha Agentes (Delega para o agente/decorator)
    for (var _a = 0, agents_2 = agents; _a < agents_2.length; _a++) {
        var agent = agents_2[_a];
        agent.draw(ctx);
    }
}
canvas.addEventListener("click", function (e) {
    var rect = canvas.getBoundingClientRect();
    var x = Math.floor((e.clientX - rect.left) / cellSize);
    var y = Math.floor((e.clientY - rect.top) / cellSize);
    if (e.shiftKey) {
        gridManager.toggleWall(x, y); // Uso do Singleton
        draw();
        return;
    }
    if (selectingOrigin) {
        currentOrigin = { x: x, y: y };
        selectingOrigin = false;
    }
    else {
        if (currentOrigin) {
            var dest = { x: x, y: y };
            var path = pathfinder.findPath(currentOrigin, dest);
            // Criação do Agente
            var newAgent = new BaseAgent(path, colors[agents.length % colors.length]);
            // Aplicação Aleatória do DECORATOR
            // 50% de chance do agente ser "Turbo"
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
function loop() {
    for (var _i = 0, agents_3 = agents; _i < agents_3.length; _i++) {
        var agent = agents_3[_i];
        agent.update();
    }
    draw();
    requestAnimationFrame(loop);
}
// Botão Random
btnRandom.addEventListener("click", function () {
    for (var i = 0; i < 3; i++) {
        var o = { x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize) };
        var d = { x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize) };
        var path = pathfinder.findPath(o, d);
        var agent = new BaseAgent(path, colors[Math.floor(Math.random() * colors.length)]);
        // Decorator aplicado dinamicamente
        agent = new TurboDecorator(agent);
        agents.push(agent);
    }
});
draw();
loop();
