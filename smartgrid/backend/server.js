import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { SimulationEngine } from './engine/simulationEngine.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const engine = new SimulationEngine();

// REST Endpoints
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    isPaused: engine.isPaused,
    tickCount: engine.tickCount,
    marketStats: engine.marketStats,
    weather: engine.weather,
    demandScenario: engine.demandScenario
  });
});

app.post('/api/control/pause', (req, res) => {
  const isPaused = engine.togglePause();
  io.emit('grid-update', engine.tick());
  res.json({ isPaused });
});

app.post('/api/control/weather', (req, res) => {
  const { weather } = req.body;
  if (weather) {
    engine.setWeather(weather);
    io.emit('grid-update', engine.tick());
  }
  res.json({ weather: engine.weather });
});

app.post('/api/control/demand', (req, res) => {
  const { demandScenario } = req.body;
  if (demandScenario) {
    engine.setDemandScenario(demandScenario);
    io.emit('grid-update', engine.tick());
  }
  res.json({ demandScenario: engine.demandScenario });
});

// Socket.io Connection & Handlers
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Send initial state immediately on connection
  socket.emit('grid-update', {
    nodes: engine.nodes,
    transactions: engine.transactions,
    activeTrades: engine.activeTrades,
    marketStats: engine.marketStats,
    weather: engine.weather,
    demandScenario: engine.demandScenario,
    isPaused: engine.isPaused,
    tickCount: engine.tickCount
  });

  socket.on('toggle-pause', () => {
    engine.togglePause();
    io.emit('grid-update', {
      nodes: engine.nodes,
      transactions: engine.transactions,
      activeTrades: engine.activeTrades,
      marketStats: engine.marketStats,
      weather: engine.weather,
      demandScenario: engine.demandScenario,
      isPaused: engine.isPaused,
      tickCount: engine.tickCount
    });
  });

  socket.on('set-weather', (weather) => {
    engine.setWeather(weather);
    io.emit('grid-update', engine.tick());
  });

  socket.on('set-demand', (scenario) => {
    engine.setDemandScenario(scenario);
    io.emit('grid-update', engine.tick());
  });

  socket.on('update-node-strategy', ({ nodeId, settings }) => {
    const updatedNode = engine.updateNodeStrategy(nodeId, settings);
    if (updatedNode) {
      io.emit('grid-update', {
        nodes: engine.nodes,
        transactions: engine.transactions,
        activeTrades: engine.activeTrades,
        marketStats: engine.marketStats,
        weather: engine.weather,
        demandScenario: engine.demandScenario,
        isPaused: engine.isPaused,
        tickCount: engine.tickCount
      });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// 3-second simulation market tick
const TICK_INTERVAL_MS = 3000;
setInterval(() => {
  const payload = engine.tick();
  io.emit('grid-update', payload);
}, TICK_INTERVAL_MS);

server.listen(PORT, () => {
  console.log(`⚡ Smart Grid Market Engine server running on http://localhost:${PORT}`);
});
