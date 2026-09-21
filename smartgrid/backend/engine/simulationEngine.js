import { createInitialNodes } from './nodesData.js';

export class SimulationEngine {
  constructor() {
    this.nodes = createInitialNodes();
    this.transactions = [];
    this.activeTrades = [];
    this.isPaused = false;
    this.tickCount = 0;
    this.weather = 'Sunny'; // 'Sunny' | 'Cloudy' | 'Solar Surge'
    this.demandScenario = 'Normal'; // 'Normal' | 'Peak Surge'
    this.marketStats = {
      spotPrice: 0.18,
      totalP2PVolumeKwh: 142.8,
      totalP2PValueUsd: 25.70,
      cleanEnergyRatio: 88,
      activeTradesCount: 0,
      gridLoadKwh: 24.5
    };
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    return this.isPaused;
  }

  setWeather(weather) {
    this.weather = weather;
  }

  setDemandScenario(scenario) {
    this.demandScenario = scenario;
  }

  updateNodeStrategy(nodeId, newSettings) {
    const node = this.nodes.find(n => n.id === nodeId);
    if (node) {
      Object.assign(node, newSettings);
      return node;
    }
    return null;
  }

  tick() {
    if (this.isPaused) {
      return {
        nodes: this.nodes,
        transactions: this.transactions,
        activeTrades: this.activeTrades,
        marketStats: this.marketStats,
        weather: this.weather,
        demandScenario: this.demandScenario,
        isPaused: this.isPaused,
        tickCount: this.tickCount
      };
    }

    this.tickCount++;
    const currentTickTransactions = [];
    const currentActiveTrades = [];

    // 1. Weather and Demand modifiers
    let solarMultiplier = 1.0;
    if (this.weather === 'Sunny') solarMultiplier = 1.0 + (Math.random() * 0.2 - 0.1);
    else if (this.weather === 'Cloudy') solarMultiplier = 0.5 + (Math.random() * 0.15);
    else if (this.weather === 'Solar Surge') solarMultiplier = 1.6 + (Math.random() * 0.3);

    let demandMultiplier = 1.0;
    if (this.demandScenario === 'Normal') demandMultiplier = 1.0 + (Math.random() * 0.2 - 0.1);
    else if (this.demandScenario === 'Peak Surge') demandMultiplier = 1.6 + (Math.random() * 0.4);

    // 2. Fluctuate generation & consumption per node
    const sellers = [];
    const buyers = [];

    this.nodes.forEach(node => {
      if (node.category === 'Prosumer') {
        // Base solar generation with noise & weather
        const baseSolar = node.id === 'prosumer-1' ? 7.5 : node.id === 'prosumer-2' ? 16.0 : 26.0;
        const jitter = (Math.random() * 1.2 - 0.6);
        node.solarGeneration = Math.max(0.5, Number((baseSolar * solarMultiplier + jitter).toFixed(2)));

        // Base load consumption
        const baseLoad = node.id === 'prosumer-1' ? 2.0 : node.id === 'prosumer-2' ? 5.0 : 4.0;
        node.loadConsumption = Math.max(0.5, Number((baseLoad * demandMultiplier + (Math.random() * 0.6 - 0.3)).toFixed(2)));

        const netInstantEnergy = node.solarGeneration - node.loadConsumption;

        // Battery logic
        if (netInstantEnergy > 0) {
          node.battery = Math.min(node.maxBattery, Number((node.battery + (netInstantEnergy * 0.3)).toFixed(2)));
        } else {
          node.battery = Math.max(0, Number((node.battery + (netInstantEnergy * 0.3)).toFixed(2)));
        }

        const batteryPercentage = (node.battery / node.maxBattery) * 100;
        const reserveKwh = (node.minBatteryReserve / 100) * node.maxBattery;
        const tradeableSurplus = Math.max(0, node.battery - reserveKwh);

        if (tradeableSurplus > 1.0 && netInstantEnergy > 0) {
          node.tradingStatus = 'Selling';
          sellers.push({
            node,
            availableKwh: Number(Math.min(tradeableSurplus, netInstantEnergy * 1.5).toFixed(2)),
            targetPrice: node.targetSellPrice || 0.15
          });
        } else if (node.battery >= node.maxBattery * 0.95) {
          node.tradingStatus = 'Feeding Grid';
          sellers.push({
            node,
            availableKwh: Number((netInstantEnergy * 0.8).toFixed(2)),
            targetPrice: 0.10
          });
        } else {
          node.tradingStatus = 'Charging';
        }
      } else if (node.category === 'Consumer') {
        const baseLoad = node.id === 'consumer-1' ? 16.0 : node.id === 'consumer-2' ? 13.0 : 8.0;
        node.loadConsumption = Math.max(1.0, Number((baseLoad * demandMultiplier + (Math.random() * 1.5 - 0.75)).toFixed(2)));
        node.solarGeneration = 0;

        // Battery discharges
        node.battery = Math.max(2.0, Number((node.battery - (node.loadConsumption * 0.25)).toFixed(2)));

        const batteryPercentage = (node.battery / node.maxBattery) * 100;
        const neededKwh = Number((node.loadConsumption * 0.7 + Math.max(0, (node.maxBattery * 0.5 - node.battery))).toFixed(2));

        if (neededKwh > 0.5) {
          node.tradingStatus = 'Buying';
          buyers.push({
            node,
            neededKwh: neededKwh,
            maxPrice: node.maxBuyPrice || 0.25
          });
        } else {
          node.tradingStatus = 'Idle';
        }
      }
    });

    // 3. Dynamic Spot Market Price Calculation
    const totalSurplus = sellers.reduce((acc, s) => acc + s.availableKwh, 0);
    const totalDeficit = buyers.reduce((acc, b) => acc + b.neededKwh, 0);

    const supplyDemandRatio = totalSurplus / (totalDeficit + 0.01);
    let dynamicPrice = 0.18;
    if (supplyDemandRatio > 1.5) {
      dynamicPrice = Math.max(0.10, 0.18 - (supplyDemandRatio - 1.5) * 0.04);
    } else if (supplyDemandRatio < 0.8) {
      dynamicPrice = Math.min(0.28, 0.18 + (0.8 - supplyDemandRatio) * 0.08);
    }
    this.marketStats.spotPrice = Number(dynamicPrice.toFixed(3));

    // 4. Bilateral Matching Engine (P2P Trading)
    sellers.sort((a, b) => a.targetPrice - b.targetPrice);
    buyers.sort((a, b) => b.maxPrice - a.maxPrice);

    let p2pVolumeThisTick = 0;
    let p2pValueThisTick = 0;

    for (const buyer of buyers) {
      for (const seller of sellers) {
        if (buyer.neededKwh <= 0.1 || seller.availableKwh <= 0.1) continue;

        if (seller.node.id !== buyer.node.id && seller.targetPrice <= dynamicPrice && dynamicPrice <= buyer.maxPrice) {
          const tradeVolume = Math.min(buyer.neededKwh, seller.availableKwh);
          const tradeCost = Number((tradeVolume * dynamicPrice).toFixed(3));

          // Financial and energy settlements
          buyer.neededKwh -= tradeVolume;
          seller.availableKwh -= tradeVolume;

          buyer.node.walletBalance = Number((buyer.node.walletBalance - tradeCost).toFixed(2));
          seller.node.walletBalance = Number((seller.node.walletBalance + tradeCost).toFixed(2));

          buyer.node.battery = Math.min(buyer.node.maxBattery, Number((buyer.node.battery + tradeVolume * 0.4).toFixed(2)));
          seller.node.battery = Math.max(0, Number((seller.node.battery - tradeVolume * 0.4).toFixed(2)));

          p2pVolumeThisTick += tradeVolume;
          p2pValueThisTick += tradeCost;

          const tx = {
            id: `tx-p2p-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            timestamp: new Date().toLocaleTimeString(),
            type: 'P2P',
            buyerId: buyer.node.id,
            buyerName: buyer.node.name,
            sellerId: seller.node.id,
            sellerName: seller.node.name,
            amountKwh: Number(tradeVolume.toFixed(2)),
            pricePerKwh: Number(dynamicPrice.toFixed(3)),
            totalCost: tradeCost,
            status: 'Settled'
          };

          currentTickTransactions.push(tx);
          currentActiveTrades.push({
            id: `trade-${seller.node.id}-${buyer.node.id}-${this.tickCount}`,
            source: seller.node.id,
            target: buyer.node.id,
            type: 'P2P',
            amount: Number(tradeVolume.toFixed(1)),
            price: Number(dynamicPrice.toFixed(2))
          });

          // Log to node history
          buyer.node.history = [tx, ...(buyer.node.history || [])].slice(0, 15);
          seller.node.history = [tx, ...(seller.node.history || [])].slice(0, 15);
        }
      }
    }

    // 5. Utility Grid Fallback (Unsatisfied deficits or excess dumps)
    const gridNode = this.nodes.find(n => n.id === 'grid-main');
    let gridDispatchThisTick = 0;

    for (const buyer of buyers) {
      if (buyer.neededKwh > 0.5 && gridNode) {
        const gridVolume = buyer.neededKwh;
        const gridCost = Number((gridVolume * gridNode.basePrice).toFixed(3));

        buyer.node.walletBalance = Number((buyer.node.walletBalance - gridCost).toFixed(2));
        buyer.node.battery = Math.min(buyer.node.maxBattery, Number((buyer.node.battery + gridVolume * 0.3).toFixed(2)));
        buyer.node.tradingStatus = 'Grid Fallback';

        gridDispatchThisTick += gridVolume;

        const tx = {
          id: `tx-grid-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          timestamp: new Date().toLocaleTimeString(),
          type: 'GRID_IMPORT',
          buyerId: buyer.node.id,
          buyerName: buyer.node.name,
          sellerId: gridNode.id,
          sellerName: gridNode.name,
          amountKwh: Number(gridVolume.toFixed(2)),
          pricePerKwh: gridNode.basePrice,
          totalCost: gridCost,
          status: 'Settled'
        };

        currentTickTransactions.push(tx);
        currentActiveTrades.push({
          id: `trade-grid-${buyer.node.id}-${this.tickCount}`,
          source: gridNode.id,
          target: buyer.node.id,
          type: 'GRID_IMPORT',
          amount: Number(gridVolume.toFixed(1)),
          price: gridNode.basePrice
        });

        buyer.node.history = [tx, ...(buyer.node.history || [])].slice(0, 15);
      }
    }

    // 6. Grid Feed-In for remaining heavy surplus
    for (const seller of sellers) {
      if (seller.availableKwh > 2.0 && gridNode) {
        const feedVolume = Number((seller.availableKwh * 0.5).toFixed(2));
        const earning = Number((feedVolume * gridNode.feedInTariff).toFixed(3));

        seller.node.walletBalance = Number((seller.node.walletBalance + earning).toFixed(2));
        seller.node.battery = Math.max(0, Number((seller.node.battery - feedVolume * 0.3).toFixed(2)));

        const tx = {
          id: `tx-feed-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          timestamp: new Date().toLocaleTimeString(),
          type: 'GRID_FEEDIN',
          buyerId: gridNode.id,
          buyerName: gridNode.name,
          sellerId: seller.node.id,
          sellerName: seller.node.name,
          amountKwh: feedVolume,
          pricePerKwh: gridNode.feedInTariff,
          totalCost: earning,
          status: 'Settled'
        };

        currentTickTransactions.push(tx);
        currentActiveTrades.push({
          id: `trade-feed-${seller.node.id}-${this.tickCount}`,
          source: seller.node.id,
          target: gridNode.id,
          type: 'GRID_FEEDIN',
          amount: Number(feedVolume.toFixed(1)),
          price: gridNode.feedInTariff
        });

        seller.node.history = [tx, ...(seller.node.history || [])].slice(0, 15);
      }
    }

    // Update Grid stats
    if (gridNode) {
      gridNode.currentDispatch = Number((20 + gridDispatchThisTick).toFixed(1));
      gridNode.stats.totalDispatchedKwh = Number((gridNode.stats.totalDispatchedKwh + gridDispatchThisTick).toFixed(1));
    }

    // Update Global Transactions Log
    this.transactions = [...currentTickTransactions, ...this.transactions].slice(0, 80);
    this.activeTrades = currentActiveTrades;

    // Update Market Stats
    this.marketStats.totalP2PVolumeKwh = Number((this.marketStats.totalP2PVolumeKwh + p2pVolumeThisTick).toFixed(1));
    this.marketStats.totalP2PValueUsd = Number((this.marketStats.totalP2PValueUsd + p2pValueThisTick).toFixed(2));
    this.marketStats.activeTradesCount = currentActiveTrades.length;
    this.marketStats.gridLoadKwh = Number((20 + gridDispatchThisTick).toFixed(1));

    const totalTradedEnergy = p2pVolumeThisTick + gridDispatchThisTick;
    if (totalTradedEnergy > 0) {
      this.marketStats.cleanEnergyRatio = Math.round((p2pVolumeThisTick / totalTradedEnergy) * 100);
    }

    return {
      nodes: this.nodes,
      transactions: this.transactions,
      activeTrades: this.activeTrades,
      marketStats: this.marketStats,
      weather: this.weather,
      demandScenario: this.demandScenario,
      isPaused: this.isPaused,
      tickCount: this.tickCount
    };
  }
}
