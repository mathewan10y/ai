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

  socket.on('grid-update', (data) => {
    set((state) => ({
      nodes: data.nodes || state.nodes,
      transactions: data.transactions || state.transactions,
      activeTrades: data.activeTrades || [],
      marketStats: data.marketStats || state.marketStats,
      weather: data.weather || state.weather,
      demandScenario: data.demandScenario || state.demandScenario,
      isPaused: typeof data.isPaused === 'boolean' ? data.isPaused : state.isPaused,
      tickCount: data.tickCount || state.tickCount
    }));
  });

  return {
    socket,
    isConnected: false,
    nodes: [],
    transactions: [],
    activeTrades: [],
    marketStats: {
      spotPrice: 0.18,
      totalP2PVolumeKwh: 0,
      totalP2PValueUsd: 0,
      cleanEnergyRatio: 100,
      activeTradesCount: 0,
      gridLoadKwh: 0
    },
    weather: 'Sunny',
    demandScenario: 'Normal',
    isPaused: false,
    tickCount: 0,
    selectedNodeId: null,

    // Actions
    setSelectedNodeId: (id) => set({ selectedNodeId: id }),

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
    }
  };
});
