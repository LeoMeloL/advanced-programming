document.addEventListener('DOMContentLoaded', () => {

    const canvas = document.getElementById('minkowskiCanvas');
    const ctx = canvas.getContext('2d');
    const generateButton = document.getElementById('generateButton');
    const exportButton = document.getElementById('exportButton');

    function generateRandomConvexPolygon(numVertices, avgRadius, variation, offsetX, offsetY) {
        const vertices = [];
        const angles = [];
        
        for (let i = 0; i < numVertices; i++) {
            angles.push(Math.random() * 2 * Math.PI);
        }
        angles.sort();

        for (const angle of angles) {
            const radius = avgRadius + (Math.random() - 0.5) * variation;
            const x = offsetX + radius * Math.cos(angle);
            const y = offsetY + radius * Math.sin(angle);
            vertices.push({ x: x, y: y });
        }
        return vertices;
    }

    function drawPolygon(ctx, polygon, fillStyle, strokeStyle = 'black') {
        if (polygon.length === 0) return;
        ctx.beginPath();
        ctx.moveTo(polygon[0].x, polygon[0].y);
        for (let i = 1; i < polygon.length; i++) {
            ctx.lineTo(polygon[i].x, polygon[i].y);
        }
        ctx.closePath();
        if (fillStyle) {
            ctx.fillStyle = fillStyle;
            ctx.fill();
        }
        if (strokeStyle) {
            ctx.strokeStyle = strokeStyle;
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    function getEdges(polygon) {
        const edges = [];
        for (let i = 0; i < polygon.length; i++) {
            const p1 = polygon[i];
            const p2 = polygon[(i + 1) % polygon.length];
            const edge = { x: p2.x - p1.x, y: p2.y - p1.y };
            edge.angle = Math.atan2(edge.y, edge.x);
            edges.push(edge);
        }
        return edges;
    }

    function getStartVertex(polygon) {
        let start = polygon[0];
        for (let i = 1; i < polygon.length; i++) {
            if (polygon[i].y < start.y || (polygon[i].y === start.y && polygon[i].x < start.x)) {
                start = polygon[i];
            }
        }
        return start;
    }

    function minkowskiSum(polyA, polyB) {
        const edgesA = getEdges(polyA);
        const edgesB = getEdges(polyB);
        const allEdges = [...edgesA, ...edgesB].sort((a, b) => a.angle - b.angle);
        const startA = getStartVertex(polyA);
        const startB = getStartVertex(polyB);
        const sumStart = { x: startA.x + startB.x, y: startA.y + startB.y };
        const sumPolygon = [sumStart];
        let currentVertex = { ...sumStart };
        for (const edge of allEdges) {
            currentVertex = { x: currentVertex.x + edge.x, y: currentVertex.y + edge.y };
            sumPolygon.push(currentVertex);
        }
        sumPolygon.pop();
        return sumPolygon;
    }

    function isPointInConvexPolygon(point, polygon) {
        for (let i = 0; i < polygon.length; i++) {
            const p1 = polygon[i];
            const p2 = polygon[(i + 1) % polygon.length];
            const crossProduct = (p2.x - p1.x) * (point.y - p1.y) - (p2.y - p1.y) * (point.x - p1.x);

            if (crossProduct < 0) {
                return false;
            }
        }
        return true;
    }

    function getClosestPointOnSegment(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;

        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return p1;

        const t = (-p1.x * dx - p1.y * dy) / lenSq;

        if (t < 0) return p1;
        if (t > 1) return p2;

        return {
            x: p1.x + t * dx,
            y: p1.y + t * dy
        };
    }

    function findMinimumDistance(polygon) {
        const origin = { x: 0, y: 0 };

        if (isPointInConvexPolygon(origin, polygon)) {
            return 0;
        }

        let minDistanceSq = Infinity;

        for (let i = 0; i < polygon.length; i++) {
            const p1 = polygon[i];
            const p2 = polygon[(i + 1) % polygon.length];
            
            const closestPoint = getClosestPointOnSegment(p1, p2);
            const distSq = closestPoint.x * closestPoint.x + closestPoint.y * closestPoint.y;
            
            if (distSq < minDistanceSq) {
                minDistanceSq = distSq;
            }
        }
        
        return Math.sqrt(minDistanceSq);
    }

    function downloadJSON(data, filename) {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function runPerformanceAnalysis() {
        console.log("Starting performance analysis...");
        exportButton.textContent = "Calculating...";
        exportButton.disabled = true;

        setTimeout(() => {
            const results = [];
            const MAX_VERTICES = 100;
            const SAMPLES_PER_STEP = 3;

            for (let n = 3; n <= MAX_VERTICES; n += 2) {
                let totalTime = 0;
                let totalOutputVertices = 0;
                let totalMinDistance = 0;

                for (let s = 0; s < SAMPLES_PER_STEP; s++) {
                    const polyA_input = generateRandomConvexPolygon(n, 30, 10, 0, 0)
                                            .map(p => ({ x: -p.x, y: -p.y }));
                    const polyB_obstacle = generateRandomConvexPolygon(n, 80, 40, 300, 300);
                    const t0 = performance.now();
                    const minkowskiResult = minkowskiSum(polyA_input, polyB_obstacle);
                    const t1 = performance.now();
                    const minDistance = findMinimumDistance(minkowskiResult);
                    
                    totalTime += (t1 - t0);
                    totalOutputVertices += minkowskiResult.length;
                    totalMinDistance += minDistance;
                }

                results.push({
                    inputVertices: n,
                    outputVerticesAvg: totalOutputVertices / SAMPLES_PER_STEP,
                    calculationTimeMsAvg: totalTime / SAMPLES_PER_STEP,
                    minDistanceAvg: totalMinDistance / SAMPLES_PER_STEP
                });
                console.log(`N = ${n} (de ${MAX_VERTICES})`);
            }

            downloadJSON(results, 'minkowski_analysis.json');
            console.log("Json exported.");

            exportButton.textContent = "Export Simulation Data (JSON)";
            exportButton.disabled = false;
        }, 50);
    }


    function runVisualSimulation() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const robotNumVertices = 3 + Math.floor(Math.random() * 3);
        const robotShape = generateRandomConvexPolygon(robotNumVertices, 25, 20, 0, 0);
        
        const obstacleNumVertices = 3 + Math.floor(Math.random() * 4);
        const obstacleX = canvas.width * (0.3 + Math.random() * 0.4);
        const obstacleY = canvas.height * (0.3 + Math.random() * 0.4);
        const polyB_obstacle = generateRandomConvexPolygon(obstacleNumVertices, 70, 50, obstacleX, obstacleY);

        const robotDrawX = canvas.width * (0.1 + Math.random() * 0.1);
        const robotDrawY = canvas.height * (0.1 + Math.random() * 0.1);
        const polyA_robot = robotShape.map(p => ({ x: p.x + robotDrawX, y: p.y + robotDrawY }));
        const polyA_sum_input = robotShape.map(p => ({ x: -p.x, y: -p.y }));

        const minkowskiResult = minkowskiSum(polyA_sum_input, polyB_obstacle);
        
        drawPolygon(ctx, minkowskiResult, 'rgba(0, 255, 0, 0.4)', 'green');
        drawPolygon(ctx, polyA_robot, 'rgba(0, 0, 255, 0.7)', 'blue');
        drawPolygon(ctx, polyB_obstacle, 'rgba(255, 0, 0, 0.7)', 'red');

        ctx.fillStyle = 'black';
        ctx.font = '14px sans-serif';
        if (polyA_robot.length > 0) ctx.fillText('Robot (A)', polyA_robot[0].x, polyA_robot[0].y - 5);
        if (polyB_obstacle.length > 0) ctx.fillText('Obstacle (B)', polyB_obstacle[0].x, polyB_obstacle[0].y - 5);
        if (minkowskiResult.length > 0) ctx.fillText('Addition (B + (-A))', minkowskiResult[0].x, minkowskiResult[0].y - 5);

        const minDistance = findMinimumDistance(minkowskiResult);
        
        ctx.fillStyle = 'black';
        ctx.font = '16px sans-serif';
        ctx.fillText(`Min Distance: ${minDistance.toFixed(2)}px`, 20, 30);

        if (minDistance > 0.01) {

        } else if (minDistance === 0) {
             ctx.fillStyle = 'red';
             ctx.fillText(`COLLISION!`, 20, 55);
        }
    }

    generateButton.addEventListener('click', runVisualSimulation);
    exportButton.addEventListener('click', runPerformanceAnalysis);

    runVisualSimulation();
});