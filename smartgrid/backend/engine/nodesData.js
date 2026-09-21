// Initial configuration for Smart Grid Nodes
export const createInitialNodes = () => [
  {
    id: 'grid-main',
    type: 'GridNode',
    name: 'Metro Substation Alpha',
    category: 'UtilityGrid',
    capacity: 1000, // kW
    currentDispatch: 24.5,
    basePrice: 0.32, // $/kWh fallback retail price
    feedInTariff: 0.08, // $/kWh feed-in price
    status: 'Operational',
    stability: 99.8,
    position: { x: 450, y: 240 },
    stats: {
      totalDispatchedKwh: 1240.5,
      totalAbsorbedKwh: 310.2,
      carbonOffsetKg: 850.4
    }
  },
  {
    id: 'prosumer-1',
    type: 'ProsumerNode',
    name: 'Solar Haven Villa',
    category: 'Prosumer',
    battery: 32.5, // kWh
    maxBattery: 45, // kWh
    solarGeneration: 7.8, // kW
    loadConsumption: 2.1, // kW
    walletBalance: 248.50, // $
    tradingStatus: 'Selling', // 'Selling' | 'Charging' | 'Idle'
    strategy: 'Sell surplus when battery > 55%',
    minBatteryReserve: 55, // %
    targetSellPrice: 0.16, // $/kWh
    position: { x: 120, y: 60 },
    history: []
  },
  {
    id: 'prosumer-2',
    type: 'ProsumerNode',
    name: 'EcoRoof Residences',
    category: 'Prosumer',
    battery: 58.0, // kWh
    maxBattery: 75, // kWh
    solarGeneration: 16.5, // kW
    loadConsumption: 5.2, // kW
    walletBalance: 612.80, // $
    tradingStatus: 'Selling',
    strategy: 'Aggressive P2P trade at battery > 50%',
    minBatteryReserve: 50,
    targetSellPrice: 0.14,
    position: { x: 780, y: 60 },
    history: []
  },
  {
    id: 'prosumer-3',
    type: 'ProsumerNode',
    name: 'AgriSolar Microfarm',
    category: 'Prosumer',
    battery: 92.0, // kWh
    maxBattery: 120, // kWh
    solarGeneration: 26.4, // kW
    loadConsumption: 3.8, // kW
    walletBalance: 1350.20, // $
    tradingStatus: 'Selling',
    strategy: 'Bulk green power supplier (Min reserve 40%)',
    minBatteryReserve: 40,
    targetSellPrice: 0.13,
    position: { x: 100, y: 420 },
    history: []
  },
  {
    id: 'consumer-1',
    type: 'ConsumerNode',
    name: 'Hypercharge EV Hub',
    category: 'Consumer',
    battery: 14.2, // kWh
    maxBattery: 50, // kWh
    loadConsumption: 16.8, // kW
    solarGeneration: 0,
    walletBalance: 820.00, // $
    tradingStatus: 'Buying', // 'Buying' | 'Idle' | 'Grid Fallback'
    strategy: 'Prioritize lowest P2P solar before Utility Grid',
    maxBuyPrice: 0.28,
    position: { x: 800, y: 420 },
    history: []
  },
  {
    id: 'consumer-2',
    type: 'ConsumerNode',
    name: 'CyberTech Datacenter',
    category: 'Consumer',
    battery: 28.0, // kWh
    maxBattery: 60, // kWh
    loadConsumption: 13.5, // kW
    solarGeneration: 0,
    walletBalance: 1540.50, // $
    tradingStatus: 'Buying',
    strategy: 'Maintain > 50% battery buffer via P2P green contracts',
    maxBuyPrice: 0.26,
    position: { x: 450, y: 550 },
    history: []
  },
  {
    id: 'consumer-3',
    type: 'ConsumerNode',
    name: 'Greenwood Smart District',
    category: 'Consumer',
    battery: 9.5, // kWh
    maxBattery: 35, // kWh
    loadConsumption: 8.2, // kW
    solarGeneration: 0,
    walletBalance: 390.40, // $
    tradingStatus: 'Buying',
    strategy: 'Residential load aggregation, buy cheapest P2P',
    maxBuyPrice: 0.24,
    position: { x: 450, y: -40 },
    history: []
  }
];
