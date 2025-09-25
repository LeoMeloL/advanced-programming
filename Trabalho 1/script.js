const canvas = document.getElementById("canvas");
const fixedTooltip = document.getElementById("fixedTooltip");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const tooltip = document.getElementById("tooltip");

let isPaused = false;
let speedMultiplier = 1.0;

const pauseBtn = document.getElementById("pauseBtn");
const resumeBtn = document.getElementById("resumeBtn");
const slowDownBtn = document.getElementById("slowDownBtn");
const speedUpBtn = document.getElementById("speedUpBtn");
const exportBtn = document.getElementById("exportBtn");

const simulationLog = {
  startTime: Date.now(),
  endTime: null,
  durationMs: null,
  windowSize: { width: canvas.width, height: canvas.height },
  mousePath: [],
  clicks: []
};


class Circle {
  constructor(x, y, raio, id) {
    this.x = x;
    this.y = y;
    this.raio = raio;
    this.id = id;
    this.dx = (Math.random() - 0.5) * 4;
    this.dy = (Math.random() - 0.5) * 4;

    this.color = this.colorGenerator()
  }

  colorGenerator() {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    return `rgb(${r},${g},${b})`;
  }

  move() {
    this.x += this.dx * speedMultiplier;
    this.y += this.dy * speedMultiplier;

    if (Math.random() < 0.01) {
      this.dx = (Math.random() - 0.5) * 4;
      this.dy = (Math.random() - 0.5) * 4;
    }

    if (this.x - this.raio < 0 || this.x + this.raio > canvas.width) this.dx *= -1;
    if (this.y - this.raio < 0 || this.y + this.raio > canvas.height) this.dy *= -1;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.raio, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
  }

  isHover(mx, my) {
    const dist = Math.hypot(this.x - mx, this.y - my);
    return dist <= this.raio;
  }
}

class Line {
  constructor(x1, y1, x2, y2, id) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.id = id;

    this.dx = (Math.random() - 0.5) * 2;
    this.dy = (Math.random() - 0.5) * 2;

    this.color = this.colorGenerator()
  }

  colorGenerator(){
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    return `rgb(${r},${g},${b})`;
  }

  move() {
    this.x1 += this.dx * speedMultiplier;
    this.y1 += this.dy * speedMultiplier;
    this.x2 += this.dx * speedMultiplier;
    this.y2 += this.dy * speedMultiplier;

    if (Math.random() < 0.01) {
      this.dx = (Math.random() - 0.5) * 2;
      this.dy = (Math.random() - 0.5) * 2;
    }

    if (this.x1 < 0 || this.x1 > canvas.width || this.x2 < 0 || this.x2 > canvas.width) {
        this.dx *= -1;
    }
    if (this.y1 < 0 || this.y1 > canvas.height || this.y2 < 0 || this.y2 > canvas.height) {
        this.dy *= -1;
    }
  }

  draw() {
    ctx.beginPath();
    ctx.moveTo(this.x1, this.y1);
    ctx.lineTo(this.x2, this.y2);
    ctx.strokeStyle = this.color;
    ctx.stroke();
  }

  isHover(mx, my) {
    const A = mx - this.x1;
    const B = my - this.y1;
    const C = this.x2 - this.x1;
    const D = this.y2 - this.y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;
    if (param < 0) {
      xx = this.x1;
      yy = this.y1;
    } else if (param > 1) {
      xx = this.x2;
      yy = this.y2;
    } else {
      xx = this.x1 + param * C;
      yy = this.y1 + param * D;
    }

    const dist = Math.hypot(mx - xx, my - yy);
    return dist < 5;
  }
}

const circles = [];
const lines = [];

for (let i = 0; i < 8; i++) {
  circles.push(new Circle(Math.random() * canvas.width, Math.random() * canvas.height, 10, `Circle ${i+1}`));
}

for (let i = 0; i < 5; i++) {
  lines.push(new Line(
    Math.random() * canvas.width, Math.random() * canvas.height,
    Math.random() * canvas.width, Math.random() * canvas.height,
    `Line ${i+1}`
  ));
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  [...circles, ...lines].forEach(obj => {
    if (!isPaused) {
      obj.move();
    }
    obj.draw();
  });

  requestAnimationFrame(animate);
}

animate();

canvas.addEventListener("mousemove", e => {
  const mx = e.clientX;
  const my = e.clientY;
  let found = null;


  simulationLog.mousePath.push({
    x: mx,
    y: my,
    timestamp: Date.now()
  });


  [...circles, ...lines].forEach(obj => {
    if (obj.isHover(mx, my)) found = obj;
  });

  if (found) {
    tooltip.style.display = "block";
    tooltip.style.left = `${mx + 10}px`;
    tooltip.style.top = `${my + 10}px`;
    tooltip.textContent = found.id;
  } else {
    tooltip.style.display = "none";
  }
});

canvas.addEventListener("click", e => {
  const mx = e.clientX;
  const my = e.clientY;
  let found = null;

  [...circles, ...lines].forEach(obj => {
    if (obj.isHover(mx, my)) found = obj;
  });

  simulationLog.clicks.push({
    x: mx,
    y: my,
    timestamp: Date.now(),
    clickedObjectId: found ? found.id : null
  });

  if (found) {
    fixedTooltip.style.display = "block";
    fixedTooltip.textContent = `Selecionado: ${found.id}`;
  }
});

pauseBtn.addEventListener('click', () => {
  isPaused = true;
  pauseBtn.disabled = true;
  resumeBtn.disabled = false;
});

resumeBtn.addEventListener('click', () => {
  isPaused = false;
  pauseBtn.disabled = false;
  resumeBtn.disabled = true;
});

slowDownBtn.addEventListener('click', () => {
  speedMultiplier = Math.max(0.1, speedMultiplier * 0.8);
});

speedUpBtn.addEventListener('click', () => {
  speedMultiplier = Math.min(10, speedMultiplier * 1.25);
});

function exportData() {
  simulationLog.endTime = Date.now();
  simulationLog.durationMs = simulationLog.endTime - simulationLog.startTime;

  const dataStr = JSON.stringify(simulationLog, null, 2);

  const blob = new Blob([dataStr], { type: 'application/json' });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  
  a.href = url;
  a.download = 'simulation_log.json';
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  console.log("Dados exportados");
}

exportBtn.addEventListener('click', exportData);