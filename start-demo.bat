@echo off
echo Starting Server 1 on Port 5001...
start "SERVER_1 (5001)" cmd /c "cd server-app && node index.js || pause"

echo Starting Server 2 on Port 5002...
start "SERVER_2 (5002)" cmd /c "cd server-app-2 && node index.js || pause"

echo Starting Load Balancer on Port 4000...
start "LOAD_BALANCER (4000)" cmd /c "cd load-balancer && node index.js || pause"

echo Starting Frontend on Port 5173...
start "FRONTEND (5173)" cmd /c "cd frontend && npm run dev || pause"

echo All services launched!
