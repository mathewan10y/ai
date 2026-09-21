import { EdgeAgent, GridAgent } from './EdgeAgent.js';

export class NodeFactory {
  constructor() {
    this.agents = new Map();
  }

  /**
   * Instantiate an autonomous EdgeAgent with an independent QLearningBrain
   */
  createAgent(config = {}) {
    let agent;
    const category = config.category || config.type?.replace('Node', '') || 'Prosumer';

    if (category.toLowerCase() === 'utilitygrid' || category.toLowerCase() === 'grid') {
      agent = new GridAgent(config);
    } else {
      agent = new EdgeAgent({
        ...config,
        category,
        type: `${category}Node`
      });
    }

    this.agents.set(agent.id, agent);
    // Start autonomous Q-Learning execution loop
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

    // 1. Primary Utility Substation
    this.createAgent({
      id: 'grid-main',
      name: 'Metro Substation Alpha',
      category: 'UtilityGrid',
      capacity: 1000,
      basePrice: 0.32,
      feedInTariff: 0.08,
      position: { x: 450, y: 240 }
    });

    // 2. Prosumer 1 - Solar Haven Villa (Battery + Solar)
    this.createAgent({
      id: 'prosumer-1',
      name: 'Solar Haven Villa',
      category: 'Prosumer',
      battery: 32.5,
      maxBattery: 45,
      baseSolar: 8.5,
      baseLoad: 2.1,
      walletBalance: 248.50,
      deferrableLoadKWh: 3.5,
      position: { x: 120, y: 60 }
    });

    // 3. Prosumer 2 - EcoRoof Residences (Battery + Solar)
    this.createAgent({
      id: 'prosumer-2',
      name: 'EcoRoof Residences',
      category: 'Prosumer',
      battery: 58.0,
      maxBattery: 75,
      baseSolar: 17.0,
      baseLoad: 5.2,
      walletBalance: 612.80,
      deferrableLoadKWh: 6.0,
      position: { x: 780, y: 60 }
    });

    // 4. SolarFarm - Solaria Utility Array (Pure Generation + Buffer)
    this.createAgent({
      id: 'solarfarm-1',
      name: 'Solaria Utility Array',
      category: 'SolarFarm',
      battery: 80.0,
      maxBattery: 150,
      baseSolar: 55.0,
      baseLoad: 1.2,
      walletBalance: 2400.00,
      deferrableLoadKWh: 0,
      position: { x: 100, y: 420 }
    });

    // 5. Consumer 1 - Hypercharge EV Hub (Heavy Load + Deferrable EV Batches)
    this.createAgent({
      id: 'consumer-1',
      name: 'Hypercharge EV Hub',
      category: 'Consumer',
      battery: 14.2,
      maxBattery: 50,
      baseSolar: 0,
      baseLoad: 17.2,
      walletBalance: 820.00,
      deferrableLoadKWh: 18.0,
      position: { x: 800, y: 420 }
    });

    // 6. Consumer 2 - CyberTech Datacenter (Continuous Industrial Load)
    this.createAgent({
      id: 'consumer-2',
      name: 'CyberTech Datacenter',
      category: 'Consumer',
      battery: 28.0,
      maxBattery: 60,
      baseSolar: 0,
      baseLoad: 14.0,
      walletBalance: 1540.50,
      deferrableLoadKWh: 8.0,
      position: { x: 450, y: 550 }
    });

    // 7. BESS - Tesla Megapack Storage (Grid Arbitrage)
    this.createAgent({
      id: 'bess-1',
      name: 'Tesla Megapack Grid BESS',
      category: 'BESS',
      battery: 120.0,
      maxBattery: 200,
      baseSolar: 0,
      baseLoad: 0.8,
      walletBalance: 3200.00,
      deferrableLoadKWh: 0,
      position: { x: 450, y: -40 }
    });

    return this.agents;
  }
}

export const nodeFactory = new NodeFactory();
