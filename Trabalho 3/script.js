const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let points = [];
let hull = [];
let generationType = "manual";


function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const p of points) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(49, 248, 99, 0.7)";
    ctx.fill();
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1.5;    
    ctx.stroke();
  }

  if (hull.length > 0) {
    ctx.beginPath();
    ctx.moveTo(hull[0].x, hull[0].y);
    for (const p of hull.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}
function cross(o, a, b) {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

function monotoneChain(points) {
  const startTime = performance.now();

  points.sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x);

  const lower = [];
  for (let p of points) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
      lower.pop();
    lower.push(p);
  }

  const upper = [];
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0)
      upper.pop();
    upper.push(p);
  }

  upper.pop();
  lower.pop();

  const hull = lower.concat(upper);
  const elapsedTime = performance.now() - startTime;
  return { hull, elapsedTime };
}

function generateRandomPoints() {
  let n = Math.floor(Math.random() * 51);
  points = [];
  generationType = "random";
  for (let i = 0; i < n; i++) {
    points.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height
    });
  }
  updateHull();
}

function generateCirclePoints() {
  let n = Math.floor(Math.random() * 51);
  points = [];
  generationType = "circle";
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const r = Math.min(canvas.width, canvas.height) / 3;
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n;
    points.push({
      x: cx + r * Math.cos(angle) + Math.random() * 10,
      y: cy + r * Math.sin(angle) + Math.random() * 10
    });
  }
  updateHull();
}

function generateRectanglePoints() {
  let n = Math.floor(Math.random() * 51);
  points = [];
  generationType = "rectangle";
  const margin = 50;
  for (let i = 0; i < n; i++) {
    points.push({
      x: margin + Math.random() * (canvas.width - 2 * margin),
      y: margin + Math.random() * (canvas.height - 2 * margin)
    });
  }
  updateHull();
}

function polygonArea(poly) {
  let area = 0;
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length;
    area += poly[i].x * poly[j].y - poly[j].x * poly[i].y;
  }
  return Math.abs(area / 2);
}

function polygonPerimeter(poly) {
  let peri = 0;
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length;
    const dx = poly[i].x - poly[j].x;
    const dy = poly[i].y - poly[j].y;
    peri += Math.sqrt(dx * dx + dy * dy);
  }
  return peri;
}

function updateHull() {
  const result = monotoneChain(points);
  hull = result.hull;
  const elapsedTime = result.elapsedTime;

  const hullArea = polygonArea(hull);
  const hullPerimeter = polygonPerimeter(hull);
  const nTotal = points.length;
  const nHull = hull.length;
  const density = nTotal / hullArea;

  const info = {
    generationType,
    n_total: nTotal,
    n_hull: nHull,
    elapsed_time_ms: elapsedTime.toFixed(3),
    hull_area: hullArea.toFixed(2),
    hull_perimeter: hullPerimeter.toFixed(2),
    density: density.toFixed(4)
  };

  console.log(info);
  draw();
  return info;
}

function exportJSON() {
  const data = updateHull();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "convex_hull_data.json";
  a.click();

  URL.revokeObjectURL(url);
}

function clearPoints(){
    points = [];
    hull = [];
    generationType = "manual";
    console.clear();
    draw();
}

canvas.addEventListener("click", e => {
  generationType = "manual";
  points.push({ x: e.offsetX, y: e.offsetY });
  updateHull();
});

document.getElementById("generateRandom").onclick = () => generateRandomPoints();
document.getElementById("generateCircle").onclick = () => generateCirclePoints();
document.getElementById("generateRectangle").onclick = () => generateRectanglePoints();
document.getElementById("exportData").onclick = () => exportJSON();
document.getElementById("clearButton").onclick = () => clearPoints();

draw();
