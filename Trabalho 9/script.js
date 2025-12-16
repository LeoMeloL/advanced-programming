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
var gridSize = 20;
var colors = ["#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231"];
var canvas;
var ctx;
var showPathsCheckbox;
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
            if (this.grid.isFree(nx, ny))
                neighbors.push({ x: nx, y: ny });
        }
        return neighbors;
    };
    return RectangularAdapter;
}());
var BFSPathfinder = /** @class */ (function () {
    function BFSPathfinder(adapter) {
        this.adapter = adapter;
    }
    BFSPathfinder.prototype.findPath = function (start, end) {
        var queue = [[start]];
        var visited = new Set(["".concat(start.x, ",").concat(start.y)]);
        while (queue.length > 0) {
            var path = queue.shift();
            var current = path[path.length - 1];
            if (current.x === end.x && current.y === end.y)
                return path;
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
var CommandInvoker = /** @class */ (function () {
    function CommandInvoker() {
        this.history = [];
    }
    CommandInvoker.prototype.executeCommand = function (command) {
        command.execute();
        this.history.push(command);
    };
    CommandInvoker.prototype.undoLast = function () {
        var command = this.history.pop();
        if (command) {
            command.undo();
            console.log("Comando desfeito (Timestamp: ".concat(command.timestamp, ")"));
        }
    };
    return CommandInvoker;
}());
var commandInvoker = new CommandInvoker();
var MoveAgentCommand = /** @class */ (function () {
    function MoveAgentCommand(agent, from, to) {
        this.agent = agent;
        this.from = from;
        this.to = to;
        this.timestamp = Date.now();
    }
    MoveAgentCommand.prototype.execute = function () {
        this.agent.setPos(this.to);
        this.agent.consumeLife(1);
    };
    MoveAgentCommand.prototype.undo = function () {
        this.agent.setPos(this.from);
        this.agent.consumeLife(-1);
    };
    return MoveAgentCommand;
}());
var LifeInsuranceObserver = /** @class */ (function () {
    function LifeInsuranceObserver() {
    }
    LifeInsuranceObserver.prototype.update = function (agent) {
        if (agent.getLife() <= 0) {
            console.log("Agente morreu! Observer acionado: Respawnando na origem.");
            agent.respawn();
        }
    };
    return LifeInsuranceObserver;
}());
var CollisionState;
(function (CollisionState) {
    CollisionState[CollisionState["None"] = 0] = "None";
    CollisionState[CollisionState["Warning"] = 1] = "Warning";
    CollisionState[CollisionState["Colliding"] = 2] = "Colliding";
})(CollisionState || (CollisionState = {}));
var CollisionSystem = /** @class */ (function () {
    function CollisionSystem() {
        this.PHYSICAL_RADIUS = 0.5;
        this.WARNING_RADIUS = 1.5;
    }
    CollisionSystem.prototype.checkCollisions = function (agents) {
        for (var _i = 0, agents_1 = agents; _i < agents_1.length; _i++) {
            var agent = agents_1[_i];
            agent.setCollisionState(CollisionState.None);
        }
        for (var i = 0; i < agents.length; i++) {
            for (var j = i + 1; j < agents.length; j++) {
                var a1 = agents[i];
                var a2 = agents[j];
                var dist = this.getDistance(a1.getPos(), a2.getPos());
                if (dist < this.PHYSICAL_RADIUS * 2) {
                    a1.setCollisionState(CollisionState.Colliding);
                    a2.setCollisionState(CollisionState.Colliding);
                }
                else if (dist < this.WARNING_RADIUS * 2) {
                    if (a1.getCollisionState() !== CollisionState.Colliding)
                        a1.setCollisionState(CollisionState.Warning);
                    if (a2.getCollisionState() !== CollisionState.Colliding)
                        a2.setCollisionState(CollisionState.Warning);
                }
            }
        }
    };
    CollisionSystem.prototype.getDistance = function (p1, p2) {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    };
    return CollisionSystem;
}());
var BaseAgent = /** @class */ (function () {
    function BaseAgent(path, color) {
        this.observers = [];
        this.life = 20;
        this.collisionState = CollisionState.None;
        this.path = path;
        this.pos = path[0];
        this.startPos = path[0];
        this.step = 0;
        this.color = color;
    }
    BaseAgent.prototype.attach = function (observer) { this.observers.push(observer); };
    BaseAgent.prototype.detach = function (observer) { this.observers = this.observers.filter(function (o) { return o !== observer; }); };
    BaseAgent.prototype.notify = function () {
        for (var _i = 0, _a = this.observers; _i < _a.length; _i++) {
            var observer = _a[_i];
            observer.update(this);
        }
    };
    BaseAgent.prototype.getLife = function () { return this.life; };
    BaseAgent.prototype.consumeLife = function (amount) {
        this.life -= amount;
        this.notify();
    };
    BaseAgent.prototype.respawn = function () {
        this.life = 20;
        this.step = 0;
        this.pos = this.startPos;
    };
    BaseAgent.prototype.setPos = function (p) { this.pos = p; };
    BaseAgent.prototype.getPos = function () { return this.pos; };
    BaseAgent.prototype.getPath = function () { return this.path; };
    BaseAgent.prototype.getColor = function () { return this.color; };
    BaseAgent.prototype.updateLogic = function () {
        if (this.step < this.path.length - 1 && this.life > 0) {
            var currentPos = this.pos;
            var nextPos = this.path[this.step + 1];
            var moveCmd = new MoveAgentCommand(this, currentPos, nextPos);
            commandInvoker.executeCommand(moveCmd);
            this.step++;
        }
    };
    BaseAgent.prototype.setCollisionState = function (state) {
        this.collisionState = state;
    };
    BaseAgent.prototype.getCollisionState = function () {
        return this.collisionState;
    };
    BaseAgent.prototype.draw = function (ctx) {
        var cellSize = canvas.width / gridSize;
        var cx = this.pos.x * cellSize + cellSize / 2;
        var cy = this.pos.y * cellSize + cellSize / 2;
        if (this.collisionState === CollisionState.Warning || this.collisionState === CollisionState.Colliding) {
            ctx.beginPath();
            ctx.strokeStyle = "rgba(255, 255, 0, 0.5)";
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.arc(cx, cy, cellSize * 1.5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        if (this.collisionState === CollisionState.Colliding) {
            ctx.fillStyle = "red";
        }
        else {
            ctx.fillStyle = this.color;
        }
        ctx.beginPath();
        ctx.arc(cx, cy, cellSize / 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "red";
        ctx.fillRect(this.pos.x * cellSize, this.pos.y * cellSize, cellSize * (this.life / 20), 4);
    };
    return BaseAgent;
}());
var AgentDecorator = /** @class */ (function () {
    function AgentDecorator(wrappedAgent) {
        this.wrappedAgent = wrappedAgent;
    }
    AgentDecorator.prototype.attach = function (o) { this.wrappedAgent.attach(o); };
    AgentDecorator.prototype.detach = function (o) { this.wrappedAgent.detach(o); };
    AgentDecorator.prototype.notify = function () { this.wrappedAgent.notify(); };
    AgentDecorator.prototype.updateLogic = function () { this.wrappedAgent.updateLogic(); };
    AgentDecorator.prototype.draw = function (ctx) { this.wrappedAgent.draw(ctx); };
    AgentDecorator.prototype.getPath = function () { return this.wrappedAgent.getPath(); };
    AgentDecorator.prototype.getColor = function () { return this.wrappedAgent.getColor(); };
    AgentDecorator.prototype.getPos = function () { return this.wrappedAgent.getPos(); };
    AgentDecorator.prototype.setPos = function (p) { this.wrappedAgent.setPos(p); };
    AgentDecorator.prototype.getLife = function () { return this.wrappedAgent.getLife(); };
    AgentDecorator.prototype.consumeLife = function (a) { this.wrappedAgent.consumeLife(a); };
    AgentDecorator.prototype.respawn = function () { this.wrappedAgent.respawn(); };
    AgentDecorator.prototype.setCollisionState = function (state) { this.wrappedAgent.setCollisionState(state); };
    AgentDecorator.prototype.getCollisionState = function () { return this.wrappedAgent.getCollisionState(); };
    return AgentDecorator;
}());
var TurboDecorator = /** @class */ (function (_super) {
    __extends(TurboDecorator, _super);
    function TurboDecorator() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    TurboDecorator.prototype.updateLogic = function () {
        this.wrappedAgent.updateLogic();
        this.wrappedAgent.updateLogic();
    };
    TurboDecorator.prototype.draw = function (ctx) {
        this.wrappedAgent.draw(ctx);
        var pos = this.wrappedAgent.getPos();
        var cellSize = canvas.width / gridSize;
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pos.x * cellSize + cellSize / 2, pos.y * cellSize + cellSize / 2, cellSize / 2.5, 0, Math.PI * 2);
        ctx.stroke();
    };
    return TurboDecorator;
}(AgentDecorator));
var InitHandler = /** @class */ (function () {
    function InitHandler() {
        this.next = null;
    }
    InitHandler.prototype.setNext = function (handler) {
        this.next = handler;
        return handler;
    };
    InitHandler.prototype.handle = function () {
        this.executeStep();
        if (this.next)
            this.next.handle();
    };
    return InitHandler;
}());
var CanvasInitHandler = /** @class */ (function (_super) {
    __extends(CanvasInitHandler, _super);
    function CanvasInitHandler() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    CanvasInitHandler.prototype.executeStep = function () {
        console.log("1. Inicializando Canvas...");
        canvas = document.getElementById("gridCanvas");
        ctx = canvas.getContext("2d");
        showPathsCheckbox = document.getElementById("showPathsCheckbox");
    };
    return CanvasInitHandler;
}(InitHandler));
var GridDataInitHandler = /** @class */ (function (_super) {
    __extends(GridDataInitHandler, _super);
    function GridDataInitHandler() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    GridDataInitHandler.prototype.executeStep = function () {
        console.log("2. Inicializando Grid Singleton...");
        GridManager.getInstance();
    };
    return GridDataInitHandler;
}(InitHandler));
var ListenersInitHandler = /** @class */ (function (_super) {
    __extends(ListenersInitHandler, _super);
    function ListenersInitHandler() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ListenersInitHandler.prototype.executeStep = function () {
        console.log("3. Configurando Listeners e Loop...");
        var btnRandom = document.getElementById("randomAgentsBtn");
        var btnUndo = document.getElementById("undoBtn");
        btnUndo.onclick = function () { return commandInvoker.undoLast(); };
        btnRandom.addEventListener("click", function () {
            var pathfinder = new BFSPathfinder(new RectangularAdapter());
            for (var i = 0; i < 3; i++) {
                var o = { x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize) };
                var d = { x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize) };
                var path = pathfinder.findPath(o, d);
                var agent = new BaseAgent(path, colors[Math.floor(Math.random() * colors.length)]);
                agent.attach(new LifeInsuranceObserver());
                if (Math.random() > 0.5)
                    agent = new TurboDecorator(agent);
                agents.push(agent);
            }
        });
        var collisionSystem = new CollisionSystem();
        var loop = function () {
            for (var _i = 0, agents_2 = agents; _i < agents_2.length; _i++) {
                var agent = agents_2[_i];
                agent.updateLogic();
            }
            collisionSystem.checkCollisions(agents);
            draw();
            setTimeout(function () { return requestAnimationFrame(loop); }, 500);
        };
        loop();
    };
    return ListenersInitHandler;
}(InitHandler));
var agents = [];
var pathfinder = new BFSPathfinder(new RectangularAdapter());
function draw() {
    var gridManager = GridManager.getInstance();
    var cellSize = canvas.width / gridSize;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var y = 0; y < gridManager.size; y++) {
        for (var x = 0; x < gridManager.size; x++) {
            ctx.strokeStyle = "#ccc";
            ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
            if (gridManager.cells[y][x] === 1) {
                ctx.fillStyle = "#333";
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
        }
    }
    if (showPathsCheckbox && showPathsCheckbox.checked) {
        for (var _i = 0, agents_3 = agents; _i < agents_3.length; _i++) {
            var agent = agents_3[_i];
            var path = agent.getPath();
            if (path && path.length > 0) {
                ctx.strokeStyle = agent.getColor();
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(path[0].x * cellSize + cellSize / 2, path[0].y * cellSize + cellSize / 2);
                for (var i = 1; i < path.length; i++) {
                    ctx.lineTo(path[i].x * cellSize + cellSize / 2, path[i].y * cellSize + cellSize / 2);
                }
                ctx.stroke();
            }
        }
    }
    for (var _a = 0, agents_4 = agents; _a < agents_4.length; _a++) {
        var agent = agents_4[_a];
        agent.draw(ctx);
    }
}
var initChain = new CanvasInitHandler();
initChain
    .setNext(new GridDataInitHandler())
    .setNext(new ListenersInitHandler());
initChain.handle();
