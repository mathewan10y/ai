import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { nodeFactory } from './agents/NodeFactory.js';
import { marketEngine } from './engine/marketEngine.js';

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

// Bootstrap initial smart grid edge agents
nodeFactory.bootstrapDefaultGrid();

// ==========================================
// REST API ENDPOINTS
// ==========================================

app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    isPaused: marketEngine.isPaused,
    tickCount: marketEngine.tickCount,
    marketStats: marketEngine.marketStats,
    weather: marketEngine.weather,
    demandScenario: marketEngine.demandScenario
  });
});

app.get('/api/grid/nodes', (req, res) => {
  res.json({ nodes: nodeFactory.getAllTelemetry() });
});

/**
 * Dynamic Node Injection Endpoint
 * Spawns an autonomous EdgeAgent instance with cryptographic wallet
 */
app.post('/api/grid/nodes', (req, res) => {
  try {
    const {
      name,
      category,
      hasBattery,
      maxBattery,
      batteryCapacity,
      battery,
      baseSolar,
      maxGen,
      baseLoad,
      deferrableLoadKWh,
      latitude,
      longitude,
      position
    } = req.body;

    if (!name || !category) {
      return res.status(400).json({ error: 'Name and Category are required' });
    }

    const agentId = `${category.toLowerCase()}-${Date.now().toString().slice(-4)}`;
    const randomOffset = (Math.random() * 80) - 40;

    const batteryCap = (hasBattery === false || maxBattery === 0 || batteryCapacity === 0)
      ? 0
      : Number(maxBattery !== undefined ? maxBattery : (batteryCapacity !== undefined ? batteryCapacity : 50));

    const initialBatt = batteryCap === 0
      ? 0
      : Number(battery !== undefined ? battery : batteryCap * 0.6);

    const newAgent = nodeFactory.createAgent({
      id: agentId,
      name,
      category,
      type: `${category}Node`,
      maxBattery: batteryCap,
      battery: initialBatt,
      baseSolar: Number(baseSolar !== undefined ? baseSolar : (maxGen || 0)),
      baseLoad: Number(baseLoad || 4.0),
      deferrableLoadKWh: Number(deferrableLoadKWh || (category === 'Consumer' ? 10.0 : 3.0)),
      latitude: typeof latitude === 'number' ? latitude : (latitude ? parseFloat(latitude) : 37.7749),
      longitude: typeof longitude === 'number' ? longitude : (longitude ? parseFloat(longitude) : -122.4194),
      position: position || { x: 450 + randomOffset, y: 350 + randomOffset }
    });

    const agentData = newAgent.toJSON();

    // Broadcast node_spawned event
    io.emit('node_spawned', agentData);
    io.emit('grid-update', marketEngine.getState());

    return res.status(201).json({
      success: true,
      message: `Autonomous EdgeAgent '${name}' created successfully with Ethereum wallet`,
      node: agentData
    });
  } catch (err) {
    console.error('[API] Error creating agent:', err);
    return res.status(500).json({ error: 'Failed to create EdgeAgent: ' + err.message });
  }
});

/**
 * Decommission / Delete Node Endpoint
 */
app.delete('/api/grid/nodes/:id', (req, res) => {
  const { id } = req.params;
  if (id === 'grid-main') {
    return res.status(400).json({ error: 'Primary Utility Substation (grid-main) cannot be decommissioned.' });
  }

  const removed = nodeFactory.removeAgent(id);
  if (!removed) {
    return res.status(404).json({ error: `EdgeAgent with ID '${id}' not found.` });
  }

  io.emit('node_deleted', { id });
  io.emit('grid-update', marketEngine.getState());

  return res.json({
    success: true,
    message: `EdgeAgent '${id}' decommissioned and removed.`
  });
});

app.post('/api/control/pause', (req, res) => {
  const isPaused = marketEngine.togglePause();
  io.emit('grid-update', marketEngine.getState());
  res.json({ isPaused });
});

app.post('/api/control/weather', (req, res) => {
  const { weather } = req.body;
  if (weather) {
    marketEngine.setWeather(weather);
    io.emit('grid-update', marketEngine.getState());
  }
  res.json({ weather: marketEngine.weather });
});

app.post('/api/control/demand', (req, res) => {
  const { demandScenario } = req.body;
  if (demandScenario) {
    marketEngine.setDemandScenario(demandScenario);
    io.emit('grid-update', marketEngine.getState());
  }
  res.json({ demandScenario: marketEngine.demandScenario });
});

// ==========================================
// SOCKET.IO REAL-TIME EVENT HANDLERS
// ==========================================

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Send full current grid state immediately
  socket.emit('grid-update', marketEngine.getState());

  socket.on('toggle-pause', () => {
    marketEngine.togglePause();
    io.emit('grid-update', marketEngine.getState());
  });

  socket.on('set-weather', (weather) => {
    marketEngine.setWeather(weather);
    io.emit('grid-update', marketEngine.getState());
  });

  socket.on('set-demand', (scenario) => {
    marketEngine.setDemandScenario(scenario);
    io.emit('grid-update', marketEngine.getState());
  });

  socket.on('update-node-strategy', ({ nodeId, settings }) => {
    const agent = nodeFactory.getAgent(nodeId);
    if (agent) {
      agent.updateSettings(settings);
      io.emit('grid-update', marketEngine.getState());
    }
  });

  socket.on('delete-node', (nodeId) => {
    if (nodeId && nodeId !== 'grid-main') {
      nodeFactory.removeAgent(nodeId);
      io.emit('node_deleted', { id: nodeId });
      io.emit('grid-update', marketEngine.getState());
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// Relay synchronized grid telemetry at 2-second heartbeat
const HEARTBEAT_INTERVAL_MS = 2000;
setInterval(() => {
  io.emit('grid-update', marketEngine.getState());
}, HEARTBEAT_INTERVAL_MS);

server.listen(PORT, () => {
  console.log(`⚡ Decentralized Smart Grid Market Engine running on http://localhost:${PORT}`);
});
