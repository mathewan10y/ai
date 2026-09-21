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

  socket.on('node_deleted', ({ id }) => {
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId
    }));
  });

  // Ephemeral edge timer registry
  const activeEdgeTimers = new Map();

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
        marketStats: data.marketStats || state.marketStats,
        weather: data.weather || state.weather,
        demandScenario: data.demandScenario || state.demandScenario,
        isPaused: typeof data.isPaused === 'boolean' ? data.isPaused : state.isPaused,
        tickCount: data.tickCount || state.tickCount
      };
    });

    // Handle ephemeral trade edges with strict 2500ms lifecycle pruning
    const incomingTrades = data.activeTrades || [];
    incomingTrades.forEach((trade) => {
      const source = trade.source || trade.sellerId;
      const target = trade.target || trade.buyerId;
      const edgeId = `edge-${source}-${target}`;

      const ephemeralTrade = {
        ...trade,
        id: edgeId,
        source,
        target
      };

      // Clear any existing timer for this edge
      if (activeEdgeTimers.has(edgeId)) {
        clearTimeout(activeEdgeTimers.get(edgeId));
      }

      // Add to store without duplication
      set((state) => ({
        activeTrades: [
          ...state.activeTrades.filter((t) => t.id !== edgeId),
          ephemeralTrade
        ]
      }));

      // Automatically prune edge after 2500ms animation completion
      const timer = setTimeout(() => {
        set((state) => ({
          activeTrades: state.activeTrades.filter((t) => t.id !== edgeId)
        }));
        activeEdgeTimers.delete(edgeId);
      }, 2500);

      activeEdgeTimers.set(edgeId, timer);
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
    },

    deleteNode: async (nodeId) => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/grid/nodes/${nodeId}`, {
          method: 'DELETE'
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Failed to delete node');
        }
        // Optimistically remove from state
        set((state) => ({
          nodes: state.nodes.filter((n) => n.id !== nodeId),
          selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId
        }));
        return result;
      } catch (err) {
        console.error('[Store] deleteNode error:', err);
        // Also emit socket fallback
        socket.emit('delete-node', nodeId);
        throw err;
      }
    }
  };
});
