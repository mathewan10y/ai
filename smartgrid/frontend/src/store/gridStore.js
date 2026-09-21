import { create } from 'zustand';
import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export const useGridStore = create((set, get) => {
  const socket = io(BACKEND_URL, {
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 10,
    reconnectionDelay: 1000
  });

  socket.on('connect', () => {
    console.log('Connected to Smart Grid Market Engine');
    set({ isConnected: true });
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from Smart Grid Market Engine');
    set({ isConnected: false });
  });

  socket.on('node_spawned', (newNode) => {
    set((state) => {
      const exists = state.nodes.some((n) => n.id === newNode.id);
      if (exists) return state;
      return {
        nodes: [...state.nodes, newNode]
      };
    });
  });

  socket.on('grid-update', (data) => {
    set((state) => {
      // Merge updated telemetry into existing node objects while preserving user drag positions
      const updatedNodes = (data.nodes || state.nodes).map((incoming) => {
        const existing = state.nodes.find((n) => n.id === incoming.id);
        const position = state.nodePositions[incoming.id] || existing?.position || incoming.position || { x: 300, y: 300 };
        return {
          ...incoming,
          position
        };
      });

      return {
        nodes: updatedNodes,
        transactions: data.transactions || state.transactions,
        activeTrades: data.activeTrades || [],
        marketStats: data.marketStats || state.marketStats,
        weather: data.weather || state.weather,
        demandScenario: data.demandScenario || state.demandScenario,
        isPaused: typeof data.isPaused === 'boolean' ? data.isPaused : state.isPaused,
        tickCount: data.tickCount || state.tickCount
      };
    });
  });

  return {
    socket,
    isConnected: false,
    nodes: [],
    nodePositions: {},
    transactions: [],
    activeTrades: [],
    marketStats: {
      spotPrice: 0.18,
      totalP2PVolumeKwh: 0,
      totalP2PValueUsd: 0,
      cleanEnergyRatio: 100,
      activeTradesCount: 0,
      gridLoadKwh: 0,
      verifiedSignaturesCount: 0
    },
    weather: 'Sunny',
    demandScenario: 'Normal',
    isPaused: false,
    tickCount: 0,
    selectedNodeId: null,

    // Actions
    setSelectedNodeId: (id) => set({ selectedNodeId: id }),

    updateNodePosition: (nodeId, position) => {
      set((state) => ({
        nodePositions: {
          ...state.nodePositions,
          [nodeId]: position
        },
        nodes: state.nodes.map((n) =>
          n.id === nodeId ? { ...n, position } : n
        )
      }));
    },

    togglePause: () => {
      socket.emit('toggle-pause');
    },

    setWeather: (weather) => {
      socket.emit('set-weather', weather);
    },

    setDemandScenario: (scenario) => {
      socket.emit('set-demand', scenario);
    },

    updateNodeStrategy: (nodeId, settings) => {
      socket.emit('update-node-strategy', { nodeId, settings });
    },

    spawnNode: async (nodeData) => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/grid/nodes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(nodeData)
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Failed to spawn node');
        }
        return result;
      } catch (err) {
        console.error('[Store] spawnNode error:', err);
        throw err;
      }
    }
  };
});
