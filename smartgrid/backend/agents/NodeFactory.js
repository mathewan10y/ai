import {
  EdgeAgent,
  ProsumerAgent,
  ConsumerAgent,
  SolarFarmAgent,
  BESSAgent,
  GridAgent
} from './EdgeAgent.js';

export class NodeFactory {
  constructor() {
    this.agents = new Map();
  }

  /**
   * Instantiate an autonomous EdgeAgent subclass based on category/type
   */
  createAgent(config = {}) {
    let agent;
    const category = config.category || config.type?.replace('Node', '') || 'Prosumer';

    switch (category.toLowerCase()) {
      case 'prosumer':
        agent = new ProsumerAgent(config);
        break;
      case 'consumer':
        agent = new ConsumerAgent(config);
        break;
      case 'solarfarm':
      case 'solar_farm':
      case 'solar':
        agent = new SolarFarmAgent(config);
        break;
      case 'bess':
      case 'battery':
      case 'storage':
        agent = new BESSAgent(config);
        break;
      case 'utilitygrid':
      case 'grid':
        agent = new GridAgent(config);
        break;
      default:
        agent = new ProsumerAgent(config);
    }

    this.agents.set(agent.id, agent);
    // Start the agent's autonomous execution loop
    agent.start();
    return agent;
  }

  getAgent(id) {
    return this.agents.get(id);
  }

  getAllAgents() {
    return Array.from(this.agents.values());
  }

  getAllTelemetry() {
    return Array.from(this.agents.values()).map(a => a.toJSON());
  }

  removeAgent(id) {
    const agent = this.agents.get(id);
    if (agent) {
      agent.destroy();
      this.agents.delete(id);
      return true;
    }
    return false;
  }

  /**
   * Bootstrap the standard initial smart grid network
   */
  bootstrapDefaultGrid() {
    // Clear any existing agents
    for (const agent of this.agents.values()) {
      agent.destroy();
    }
    this.agents.clear();

    // 1. Metro Substation
    this.createAgent({
      id: 'grid-main',
      name: 'Metro Substation Alpha',
      category: 'UtilityGrid',
      capacity: 1000,
      basePrice: 0.32,
      feedInTariff: 0.08,
      position: { x: 450, y: 240 }
    });

    // 2. Prosumer 1 - Solar Haven Villa
    this.createAgent({
      id: 'prosumer-1',
      name: 'Solar Haven Villa',
      category: 'Prosumer',
      battery: 32.5,
      maxBattery: 45,
      baseSolar: 8.5,
      baseLoad: 2.1,
      walletBalance: 248.50,
      minBatteryReserve: 55,
      targetSellPrice: 0.16,
      strategy: 'Sell surplus when battery > 55%',
      position: { x: 120, y: 60 }
    });

    // 3. Prosumer 2 - EcoRoof Residences
    this.createAgent({
      id: 'prosumer-2',
      name: 'EcoRoof Residences',
      category: 'Prosumer',
      battery: 58.0,
      maxBattery: 75,
      baseSolar: 17.0,
      baseLoad: 5.2,
      walletBalance: 612.80,
      minBatteryReserve: 50,
      targetSellPrice: 0.14,
      strategy: 'Aggressive P2P trade at battery > 50%',
      position: { x: 780, y: 60 }
    });

    // 4. Prosumer 3 - AgriSolar Microfarm
    this.createAgent({
      id: 'prosumer-3',
      name: 'AgriSolar Microfarm',
      category: 'Prosumer',
      battery: 92.0,
      maxBattery: 120,
      baseSolar: 27.5,
      baseLoad: 3.8,
      walletBalance: 1350.20,
      minBatteryReserve: 40,
      targetSellPrice: 0.13,
      strategy: 'Bulk green power supplier (Min reserve 40%)',
      position: { x: 100, y: 420 }
    });

    // 5. Consumer 1 - Hypercharge EV Hub
    this.createAgent({
      id: 'consumer-1',
      name: 'Hypercharge EV Hub',
      category: 'Consumer',
      battery: 14.2,
      maxBattery: 50,
      baseLoad: 17.2,
      walletBalance: 820.00,
      maxBuyPrice: 0.28,
      strategy: 'Prioritize lowest P2P solar before Utility Grid',
      position: { x: 800, y: 420 }
    });

    // 6. Consumer 2 - CyberTech Datacenter
    this.createAgent({
      id: 'consumer-2',
      name: 'CyberTech Datacenter',
      category: 'Consumer',
      battery: 28.0,
      maxBattery: 60,
      baseLoad: 14.0,
      walletBalance: 1540.50,
      maxBuyPrice: 0.26,
      strategy: 'Maintain > 50% battery buffer via P2P green contracts',
      position: { x: 450, y: 550 }
    });

    // 7. Consumer 3 - Greenwood Smart District
    this.createAgent({
      id: 'consumer-3',
      name: 'Greenwood Smart District',
      category: 'Consumer',
      battery: 9.5,
      maxBattery: 35,
      baseLoad: 8.2,
      walletBalance: 390.40,
      maxBuyPrice: 0.24,
      strategy: 'Residential load aggregation, buy cheapest P2P',
      position: { x: 450, y: -40 }
    });

    return this.agents;
  }
}

export const nodeFactory = new NodeFactory();
