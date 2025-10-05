const canvas = document.getElementById('voronoiCanvas');
const context = canvas.getContext('2d');
const width = canvas.width;
const height = canvas.height;

const showVoronoiCheckbox = document.getElementById('showVoronoi');
const showDelaunayCheckbox = document.getElementById('showDelaunay');
const clearButton = document.getElementById('clearButton');
const exportButton = document.getElementById('exportButton');
const addRandomPoints = document.getElementById('addRandomPoints')
const addGridPointsButton = document.getElementById('addGridPointsButton');
const addLinePointsButton = document.getElementById('addLinePointsButton');

let performanceData = [];
let points = [];
let delaunay, voronoi;

function updateAndDraw() {
    context.clearRect(0, 0, width, height);

    if (points.length < 2) {
        if (points.length === 1) drawPoints();
        return;
    }

    const startTime = performance.now();
    delaunay = d3.Delaunay.from(points);
    voronoi = delaunay.voronoi([0, 0, width, height]);

    const endTime = performance.now();
    const calculationTime = endTime - startTime;


    performanceData.push([points.length, calculationTime]);
    console.log(`Pontos: ${points.length}, Custo Computacional: ${calculationTime.toFixed(4)} ms`);

    context.save();

    if (showVoronoiCheckbox.checked) {
        context.beginPath();
        voronoi.render(context);
        context.strokeStyle = 'rgba(0, 0, 255, 0.7)';
        context.lineWidth = 1;
        context.stroke();

        context.beginPath();
        voronoi.renderBounds(context);
        context.strokeStyle = '#000';
        context.lineWidth = 1.5;
        context.stroke();
    }

    if (showDelaunayCheckbox.checked) {
        context.beginPath();
        delaunay.render(context);
        context.strokeStyle = 'rgba(255, 0, 0, 0.7)';
        context.lineWidth = 1;
        context.stroke();
    }

    drawPoints();
    context.restore();
}

function drawPoints() {
    context.fillStyle = '#000';
    context.beginPath();
    for (const [x, y] of points) {
        context.moveTo(x + 2.5, y);
        context.arc(x, y, 2.5, 0, 2 * Math.PI);
    }
    context.fill();
}

canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    points.push([x, y]);
    updateAndDraw();
});

clearButton.addEventListener('click', () => {
    points = [];
    console.clear();
    performanceData = [];
    console.log("Canvas limpo.");
    updateAndDraw();
});
addRandomPoints.addEventListener('click', () => {

    const numPointsToAdd = 100; 

    console.log(`Adicionando ${numPointsToAdd} pontos aleatórios...`);

    for (let i = 0; i < numPointsToAdd; i++) {

        const x = Math.random() * width; 

        const y = Math.random() * height;

        points.push([x, y]);

        updateAndDraw();
    }
});


showVoronoiCheckbox.addEventListener('change', updateAndDraw);
showDelaunayCheckbox.addEventListener('change', updateAndDraw);

exportButton.addEventListener('click', () => {
    if (points.length === 0) {
        alert("Nenhum ponto para exportar!");
        return;
    }

    const dataToExport = {
        columns: ['num_pontos', 'tempo_ms'],
        data: performanceData
    };

    const jsonData = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'performance_data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

addGridPointsButton.addEventListener('click', () => {
    const pointsPerRow = 10;
    const numPointsToAdd = pointsPerRow * pointsPerRow;
    console.log(`Adicionando ${numPointsToAdd} pontos em grade...`);

    const xSpacing = width / (pointsPerRow + 1);
    const ySpacing = height / (pointsPerRow + 1);

    for (let i = 1; i <= pointsPerRow; i++) {
        for (let j = 1; j <= pointsPerRow; j++) {
            const x = j * xSpacing;
            const y = i * ySpacing;
            points.push([x, y]);
            updateAndDraw();
        }
    }
});

addLinePointsButton.addEventListener('click', () => {
    const numPointsToAdd = 100;
    console.log(`Adicionando ${numPointsToAdd} pontos colineares...`);

    const y = height / 2;

    const xSpacing = width / (numPointsToAdd + 1);

    for (let i = 1; i <= numPointsToAdd; i++) {
        const x = i * xSpacing;
        points.push([x, y]);
        updateAndDraw();
    }

});
