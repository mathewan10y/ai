import { ethers } from 'ethers';
import { eventBroker } from './eventBroker.js';
import { nodeFactory } from '../agents/NodeFactory.js';

export class MarketClearingEngine {
  constructor() {
    this.pendingBids = [];
    this.pendingAsks = [];
    this.transactions = [];
    this.activeTrades = [];
    this.isPaused = false;
    this.tickCount = 0;
    this.weather = 'Sunny';
    this.demandScenario = 'Normal';

    this.marketStats = {
      spotPrice: 0.18,
      totalP2PVolumeKwh: 154.2,
      totalP2PValueUsd: 27.60,
      cleanEnergyRatio: 92,
      activeTradesCount: 0,
      gridLoadKwh: 22.0,
      verifiedSignaturesCount: 0
    };

    this.setupListeners();
    this.startMatchingLoop();
  }

  setupListeners() {
    // Listen for incoming cryptographically signed orders
    eventBroker.on('order:submit', (signedOrder) => {
      this.handleIncomingOrder(signedOrder);
    });

    eventBroker.on('agent:destroyed', ({ id }) => {
      this.pendingBids = this.pendingBids.filter(b => b.orderData.agentId !== id);
      this.pendingAsks = this.pendingAsks.filter(a => a.orderData.agentId !== id);
    });
  }

  /**
   * Cryptographically verifies incoming order signature
   */
  verifyOrderSignature(signedOrder) {
    try {
      if (!signedOrder || !signedOrder.orderData || !signedOrder.signature || !signedOrder.agentAddress) {
        return false;
      }
      const messageString = JSON.stringify(signedOrder.orderData);
      const recoveredAddress = ethers.verifyMessage(messageString, signedOrder.signature);
      const isValid = recoveredAddress.toLowerCase() === signedOrder.agentAddress.toLowerCase();
      
      if (isValid) {
        this.marketStats.verifiedSignaturesCount++;
      }
      return isValid;
    } catch (err) {
      console.error('[MarketEngine] Signature verification error:', err.message);
      return false;
    }
  }

  handleIncomingOrder(signedOrder) {
    if (this.isPaused) return;

    const isValid = this.verifyOrderSignature(signedOrder);
    if (!isValid) {
      console.warn(`[MarketEngine] Rejected unverified or forged order from ${signedOrder.agentAddress}`);
      return;
    }

    const { side, agentId } = signedOrder.orderData;
    if (side === 'BID') {
      // Replace or enqueue existing bid for this agent
      const existingIdx = this.pendingBids.findIndex(b => b.orderData.agentId === agentId);
      if (existingIdx >= 0) {
        this.pendingBids[existingIdx] = signedOrder;
      } else {
        this.pendingBids.push(signedOrder);
      }
    } else if (side === 'ASK') {
      const existingIdx = this.pendingAsks.findIndex(a => a.orderData.agentId === agentId);
      if (existingIdx >= 0) {
        this.pendingAsks[existingIdx] = signedOrder;
      } else {
        this.pendingAsks.push(signedOrder);
      }
    }
  }

  startMatchingLoop() {
    // Market clearing loop runs every 2.5 seconds
    setInterval(() => {
      if (!this.isPaused) {
        this.clearMarket();
      }
    }, 2500);
  }

  clearMarket() {
    this.tickCount++;
    const currentTickTransactions = [];
    const currentActiveTrades = [];

    // Calculate dynamic spot price based on current bid/ask liquidity depth
    const totalAskKwh = this.pendingAsks.reduce((sum, a) => sum + (a.orderData.amountKwh || 0), 0);
    const totalBidKwh = this.pendingBids.reduce((sum, b) => sum + (b.orderData.amountKwh || 0), 0);
    const liquidityRatio = totalAskKwh / (totalBidKwh + 0.1);

    let dynamicPrice = 0.18;
    if (liquidityRatio > 1.4) {
      dynamicPrice = Math.max(0.10, 0.18 - (liquidityRatio - 1.4) * 0.035);
    } else if (liquidityRatio < 0.8) {
      dynamicPrice = Math.min(0.28, 0.18 + (0.8 - liquidityRatio) * 0.07);
    }
    this.marketStats.spotPrice = Number(dynamicPrice.toFixed(3));
    eventBroker.emit('market:spotPrice', this.marketStats.spotPrice);

    // 1. Sort Order Books
    // Asks sorted cheapest first
    const asks = [...this.pendingAsks].sort((a, b) => a.orderData.priceLimit - b.orderData.priceLimit);
    // Bids sorted highest willingness to pay first
    const bids = [...this.pendingBids].sort((a, b) => b.orderData.priceLimit - a.orderData.priceLimit);

    let p2pVolumeThisTick = 0;
    let p2pValueThisTick = 0;

    // 2. Bilateral P2P Auction Matching with Single-Settlement-Per-Tick & Atomic Deductions
    const settledAgentsInTick = new Set();

    for (const bidWrapper of bids) {
      const bid = bidWrapper.orderData;
      if (bid.amountKwh <= 0.1 || settledAgentsInTick.has(bid.agentId)) continue;

      for (const askWrapper of asks) {
        const ask = askWrapper.orderData;
        if (ask.amountKwh <= 0.1 || ask.agentId === bid.agentId || settledAgentsInTick.has(ask.agentId)) continue;

        // Condition for match: Bid price >= Ask price
        if (bid.priceLimit >= ask.priceLimit) {
          // Synchronous atomic volume calculation & immediate deduction
          const tradeVolume = Math.min(bid.amountKwh, ask.amountKwh);
          const tradePrice = Number(dynamicPrice.toFixed(3));
          const tradeCost = Number((tradeVolume * tradePrice).toFixed(3));

          // Atomically deduct volume from orders immediately
          bid.amountKwh = Number((bid.amountKwh - tradeVolume).toFixed(2));
          ask.amountKwh = Number((ask.amountKwh - tradeVolume).toFixed(2));

          // Lock agents for this clearing tick
          settledAgentsInTick.add(bid.agentId);
          settledAgentsInTick.add(ask.agentId);

          // Generate cryptographic trade transaction hash
          const txHashInput = `${bidWrapper.signature}-${askWrapper.signature}-${Date.now()}`;
          const txHash = ethers.keccak256(ethers.toUtf8Bytes(txHashInput)).slice(0, 18);

          const trade = {
            id: `tx-p2p-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            txHash: `0x${txHash.replace('0x', '')}`,
            timestamp: new Date().toLocaleTimeString(),
            type: 'P2P',
            buyerId: bid.agentId,
            buyerName: bid.agentName,
            buyerAddress: bid.agentAddress,
            sellerId: ask.agentId,
            sellerName: ask.agentName,
            sellerAddress: ask.agentAddress,
            amountKwh: Number(tradeVolume.toFixed(2)),
            pricePerKwh: tradePrice,
            totalCost: tradeCost,
            status: 'Settled'
          };

          p2pVolumeThisTick += tradeVolume;
          p2pValueThisTick += tradeCost;

          currentTickTransactions.push(trade);
          currentActiveTrades.push({
            id: `trade-${ask.agentId}-${bid.agentId}-${this.tickCount}`,
            source: ask.agentId,
            target: bid.agentId,
            type: 'P2P',
            amount: Number(tradeVolume.toFixed(1)),
            price: tradePrice
          });

          // Settle balances with EdgeAgents through event broker
          eventBroker.emit('order:settled', trade);

          // If buyer bid is filled, break to next buyer
          if (bid.amountKwh <= 0.05) {
            break;
          }
        }
      }
    }

    // 3. Utility Grid Fallback for remaining unmet Bids
    const gridAgent = nodeFactory.getAgent('grid-main');
    let gridDispatchThisTick = 0;

    if (gridAgent) {
      for (const bidWrapper of bids) {
        const bid = bidWrapper.orderData;
        if (bid.amountKwh > 0.5) {
          const gridVolume = bid.amountKwh;
          const gridCost = Number((gridVolume * gridAgent.basePrice).toFixed(3));

          const trade = {
            id: `tx-grid-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            txHash: `0x${ethers.keccak256(ethers.toUtf8Bytes(`grid-${Date.now()}`)).slice(2, 18)}`,
            timestamp: new Date().toLocaleTimeString(),
            type: 'GRID_IMPORT',
            buyerId: bid.agentId,
            buyerName: bid.agentName,
            buyerAddress: bid.agentAddress,
            sellerId: gridAgent.id,
            sellerName: gridAgent.name,
            sellerAddress: gridAgent.address,
            amountKwh: Number(gridVolume.toFixed(2)),
            pricePerKwh: gridAgent.basePrice,
            totalCost: gridCost,
            status: 'Settled'
          };

          gridDispatchThisTick += gridVolume;
          bid.amountKwh = 0;

          currentTickTransactions.push(trade);
          currentActiveTrades.push({
            id: `trade-grid-${bid.agentId}-${this.tickCount}`,
            source: gridAgent.id,
            target: bid.agentId,
            type: 'GRID_IMPORT',
            amount: Number(gridVolume.toFixed(1)),
            price: gridAgent.basePrice
          });

          eventBroker.emit('order:settled', trade);
        }
      }

      // 4. Utility Grid Feed-In for remaining heavy surplus Asks
      for (const askWrapper of asks) {
        const ask = askWrapper.orderData;
        if (ask.amountKwh > 2.0) {
          const feedVolume = Number((ask.amountKwh * 0.6).toFixed(2));
          const feedEarning = Number((feedVolume * gridAgent.feedInTariff).toFixed(3));

          const trade = {
            id: `tx-feed-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            txHash: `0x${ethers.keccak256(ethers.toUtf8Bytes(`feed-${Date.now()}`)).slice(2, 18)}`,
            timestamp: new Date().toLocaleTimeString(),
            type: 'GRID_FEEDIN',
            buyerId: gridAgent.id,
            buyerName: gridAgent.name,
            buyerAddress: gridAgent.address,
            sellerId: ask.agentId,
            sellerName: ask.agentName,
            sellerAddress: ask.agentAddress,
            amountKwh: feedVolume,
            pricePerKwh: gridAgent.feedInTariff,
            totalCost: feedEarning,
            status: 'Settled'
          };

          ask.amountKwh = Number((ask.amountKwh - feedVolume).toFixed(2));

          currentTickTransactions.push(trade);
          currentActiveTrades.push({
            id: `trade-feed-${ask.agentId}-${this.tickCount}`,
            source: ask.agentId,
            target: gridAgent.id,
            type: 'GRID_FEEDIN',
            amount: Number(feedVolume.toFixed(1)),
            price: gridAgent.feedInTariff
          });

          eventBroker.emit('order:settled', trade);
        }
      }

      gridAgent.currentDispatch = Number((20 + gridDispatchThisTick).toFixed(1));
      if (gridAgent.stats) {
        gridAgent.stats.totalDispatchedKwh = Number((gridAgent.stats.totalDispatchedKwh + gridDispatchThisTick).toFixed(1));
      }
    }

    // Clear filled orders from active book
    this.pendingBids = bids.filter(b => b.orderData.amountKwh > 0.1);
    this.pendingAsks = asks.filter(a => a.orderData.amountKwh > 0.1);

    // Update Global Transactions & Active Trades
    this.transactions = [...currentTickTransactions, ...this.transactions].slice(0, 80);
    this.activeTrades = currentActiveTrades;

    // Update Market Metrics
    this.marketStats.totalP2PVolumeKwh = Number((this.marketStats.totalP2PVolumeKwh + p2pVolumeThisTick).toFixed(1));
    this.marketStats.totalP2PValueUsd = Number((this.marketStats.totalP2PValueUsd + p2pValueThisTick).toFixed(2));
    this.marketStats.activeTradesCount = currentActiveTrades.length;
    this.marketStats.gridLoadKwh = Number((20 + gridDispatchThisTick).toFixed(1));

    const totalTradedEnergy = p2pVolumeThisTick + gridDispatchThisTick;
    if (totalTradedEnergy > 0) {
      this.marketStats.cleanEnergyRatio = Math.round((p2pVolumeThisTick / totalTradedEnergy) * 100);
    }
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    eventBroker.emit('grid:pause', this.isPaused);
    return this.isPaused;
  }

  setWeather(weather) {
    this.weather = weather;
    eventBroker.emit('env:weather', weather);
  }

  setDemandScenario(scenario) {
    this.demandScenario = scenario;
    eventBroker.emit('env:demand', scenario);
  }

  getState() {
    return {
      nodes: nodeFactory.getAllTelemetry(),
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

export const marketEngine = new MarketClearingEngine();
