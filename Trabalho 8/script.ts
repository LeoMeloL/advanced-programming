interface Point {
    x: number;
    y: number;
}

const gridSize = 20;
const colors: string[] = ["#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231"];
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let showPathsCheckbox: HTMLInputElement;

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
    private grid: GridManager = GridManager.getInstance();
    getNeighbors(node: Point): Point[] {
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        const neighbors: Point[] = [];
        for (const [dx, dy] of dirs) {
            const nx = node.x + dx;
            const ny = node.y + dy;
            if (this.grid.isFree(nx, ny)) neighbors.push({ x: nx, y: ny });
        }
        return neighbors;
    }
}

class BFSPathfinder {
    constructor(private adapter: IGridAdapter) {}
    findPath(start: Point, end: Point): Point[] {
        const queue: Point[][] = [[start]];
        const visited = new Set<string>([`${start.x},${start.y}`]);
        while (queue.length > 0) {
            const path = queue.shift()!;
            const current = path[path.length - 1];
            if (current.x === end.x && current.y === end.y) return path;
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


interface ICommand {
    execute(): void;
    undo(): void;
    timestamp: number;
}

class CommandInvoker {
    private history: ICommand[] = [];

    executeCommand(command: ICommand) {
        command.execute();
        this.history.push(command);
    }

    undoLast() {
        const command = this.history.pop();
        if (command) {
            command.undo();
            console.log(`Comando desfeito (Timestamp: ${command.timestamp})`);
        }
    }
}

const commandInvoker = new CommandInvoker();

class MoveAgentCommand implements ICommand {
    timestamp: number;
    
    constructor(
        private agent: IAgent, 
        private from: Point, 
        private to: Point
    ) {
        this.timestamp = Date.now();
    }

    execute(): void {
        this.agent.setPos(this.to);
                this.agent.consumeLife(1);
    }

    undo(): void {
        this.agent.setPos(this.from);
                this.agent.consumeLife(-1);
    }
}


interface IObserver {
    update(agent: IAgent): void;
}

interface ISubject {
    attach(observer: IObserver): void;
    detach(observer: IObserver): void;
    notify(): void;
}

class LifeInsuranceObserver implements IObserver {
    update(agent: IAgent): void {
        if (agent.getLife() <= 0) {
            console.log("Agente morreu! Observer acionado: Respawnando na origem.");
                        agent.respawn();
        }
    }
}


interface IAgent extends ISubject {
    updateLogic(): void;     draw(ctx: CanvasRenderingContext2D): void;
    getPath(): Point[];
    getColor(): string;
    getPos(): Point;
    setPos(p: Point): void;     getLife(): number;          consumeLife(amount: number): void;
    respawn(): void;
}

class BaseAgent implements IAgent {
    pos: Point;
    path: Point[];
    step: number;
    color: string;
    
        private observers: IObserver[] = [];
    private life: number = 20;     private startPos: Point;

    constructor(path: Point[], color: string) {
        this.path = path;
        this.pos = path[0];
        this.startPos = path[0];         this.step = 0;
        this.color = color;
    }

        attach(observer: IObserver): void { this.observers.push(observer); }
    detach(observer: IObserver): void { this.observers = this.observers.filter(o => o !== observer); }
    notify(): void {
        for (const observer of this.observers) observer.update(this);
    }

        getLife() { return this.life; }
    
    consumeLife(amount: number) { 
        this.life -= amount; 
        this.notify();     }

    respawn() {
        this.life = 20;
        this.step = 0;
        this.pos = this.startPos;
    }

    setPos(p: Point) { this.pos = p; }
    getPos() { return this.pos; }
    getPath() { return this.path; }
    getColor() { return this.color; }

        updateLogic(): void {
        if (this.step < this.path.length - 1 && this.life > 0) {
            const currentPos = this.pos;
            const nextPos = this.path[this.step + 1];
            
                        const moveCmd = new MoveAgentCommand(this, currentPos, nextPos);
            commandInvoker.executeCommand(moveCmd);
            
            this.step++;
        }
    }

    draw(ctx: CanvasRenderingContext2D): void {
        const cellSize = canvas.width / gridSize;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(
            this.pos.x * cellSize + cellSize / 2,
            this.pos.y * cellSize + cellSize / 2,
            cellSize / 3,
            0, Math.PI * 2
        );
        ctx.fill();
        
                ctx.fillStyle = "red";
        ctx.fillRect(this.pos.x * cellSize, this.pos.y * cellSize, cellSize * (this.life/20), 4);
    }
}

abstract class AgentDecorator implements IAgent {
    constructor(protected wrappedAgent: IAgent) {}
    attach(o: IObserver) { this.wrappedAgent.attach(o); }
    detach(o: IObserver) { this.wrappedAgent.detach(o); }
    notify() { this.wrappedAgent.notify(); }
    updateLogic() { this.wrappedAgent.updateLogic(); }
    draw(ctx: CanvasRenderingContext2D) { this.wrappedAgent.draw(ctx); }
    getPath() { return this.wrappedAgent.getPath(); }
    getColor() { return this.wrappedAgent.getColor(); }
    getPos() { return this.wrappedAgent.getPos(); }
    setPos(p: Point) { this.wrappedAgent.setPos(p); }
    getLife() { return this.wrappedAgent.getLife(); }
    consumeLife(a: number) { this.wrappedAgent.consumeLife(a); }
    respawn() { this.wrappedAgent.respawn(); }
}

class TurboDecorator extends AgentDecorator {
    updateLogic(): void {
                this.wrappedAgent.updateLogic();
        this.wrappedAgent.updateLogic();
    }
    
    draw(ctx: CanvasRenderingContext2D): void {
        this.wrappedAgent.draw(ctx);
        const pos = this.wrappedAgent.getPos();
        const cellSize = canvas.width / gridSize;
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(
            pos.x * cellSize + cellSize / 2,
            pos.y * cellSize + cellSize / 2,
            cellSize / 2.5,
            0, Math.PI * 2
        );
        ctx.stroke();
    }
}


abstract class InitHandler {
    protected next: InitHandler | null = null;
    
    setNext(handler: InitHandler): InitHandler {
        this.next = handler;
        return handler;
    }

    handle(): void {
        this.executeStep();
        if (this.next) this.next.handle();
    }

    protected abstract executeStep(): void;
}

class CanvasInitHandler extends InitHandler {
    protected executeStep(): void {
        console.log("1. Inicializando Canvas...");
        canvas = document.getElementById("gridCanvas") as HTMLCanvasElement;
        ctx = canvas.getContext("2d")!;
        showPathsCheckbox = document.getElementById("showPathsCheckbox") as HTMLInputElement;
    }
}

class GridDataInitHandler extends InitHandler {
    protected executeStep(): void {
        console.log("2. Inicializando Grid Singleton...");
        GridManager.getInstance();     }
}

class ListenersInitHandler extends InitHandler {
    protected executeStep(): void {
        console.log("3. Configurando Listeners e Loop...");
        
        const btnRandom = document.getElementById("randomAgentsBtn") as HTMLButtonElement;
        
                const btnUndo = document.getElementById("undoBtn") as HTMLButtonElement;
        btnUndo.onclick = () => commandInvoker.undoLast();

        btnRandom.addEventListener("click", () => {
            const pathfinder = new BFSPathfinder(new RectangularAdapter());
            for (let i = 0; i < 3; i++) {
                const o = { x: Math.floor(Math.random()*gridSize), y: Math.floor(Math.random()*gridSize) };
                const d = { x: Math.floor(Math.random()*gridSize), y: Math.floor(Math.random()*gridSize) };
                const path = pathfinder.findPath(o, d);
                
                let agent: IAgent = new BaseAgent(path, colors[Math.floor(Math.random() * colors.length)]);
                
                                agent.attach(new LifeInsuranceObserver());

                                if(Math.random() > 0.5) agent = new TurboDecorator(agent);
                
                agents.push(agent);
            }
        });

                const loop = () => {
            for (const agent of agents) agent.updateLogic();
            draw();
            setTimeout(() => requestAnimationFrame(loop), 500);         };
        loop();
    }
}

let agents: IAgent[] = [];
const pathfinder = new BFSPathfinder(new RectangularAdapter());

function draw(): void {
    const gridManager = GridManager.getInstance();
    const cellSize = canvas.width / gridSize;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < gridManager.size; y++) {
        for (let x = 0; x < gridManager.size; x++) {
            ctx.strokeStyle = "#ccc";
            ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
            if (gridManager.cells[y][x] === 1) {
                ctx.fillStyle = "#333";
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
        }
    }
        if (showPathsCheckbox && showPathsCheckbox.checked) {
        for (const agent of agents) {
            const path = agent.getPath();
            if (path && path.length > 0) {
                ctx.strokeStyle = agent.getColor();
                ctx.lineWidth = 2;
                ctx.beginPath();
                
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
    for (const agent of agents) agent.draw(ctx);
}


const initChain = new CanvasInitHandler();
initChain
    .setNext(new GridDataInitHandler())
    .setNext(new ListenersInitHandler());

initChain.handle();