import { ethers } from 'ethers';
import { eventBroker } from './eventBroker.js';
import { nodeFactory } from '../agents/NodeFactory.js';
import { gridPhysics } from './GridPhysics.js';
import { simulationClock } from '../services/SimulationClock.js';

export class MarketClearingEngine {
  constructor() {
    this.pendingBids = [];
    this.pendingAsks = [];
    this.transactions = [];
    this.activeTrades = [];
    this.isPaused = false;
    this.tickCount = 0;
    this.batchIntervalMs = 5000; // 5-second batched Double Auction clearing window
    this.weather = 'Sunny';
    this.demandScenario = 'Normal';

    this.marketStats = {
      uniformClearingPrice: 0.18,
      spotPrice: 0.18,
      totalP2PVolumeKwh: 154.2,
      totalP2PValueUsd: 27.60,
      cleanEnergyRatio: 92,
      activeTradesCount: 0,
      gridLoadKwh: 22.0,
      verifiedSignaturesCount: 0,
      totalClearedBatches: 0,
      curtailedTradesCount: 0,
      totalCurtailedVolumeKwh: 0,
      transformerLoadKW: 0,
      thermalLimitKW: 100,
      isCongested: false
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
   * Cryptographically verifies incoming order signature with secp256k1
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
      // Replace or enqueue existing bid for this agent in the batch window
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
    // Batched Double Auction market clearing loop runs every 5 seconds
    setInterval(() => {
      if (!this.isPaused) {
        this.clearMarketBatch();
      }
    }, this.batchIntervalMs);
  }

  /**
   * Batched Double Auction (DA) Market Clearing Mechanism
   */
  clearMarketBatch() {
    this.tickCount++;
    this.marketStats.totalClearedBatches++;
    const currentTickTransactions = [];
    const currentActiveTrades = [];
    const batchId = `batch-${this.tickCount}-${Date.now().toString().slice(-4)}`;

    // 1. Sort Order Books: Bids descending (highest WTP first), Asks ascending (lowest ask first)
    const activeBids = [...this.pendingBids].filter(b => b.orderData.amountKwh > 0.1);
    const activeAsks = [...this.pendingAsks].filter(a => a.orderData.amountKwh > 0.1);

    const sortedBids = [...activeBids].sort((a, b) => b.orderData.priceLimit - a.orderData.priceLimit);
    const sortedAsks = [...activeAsks].sort((a, b) => a.orderData.priceLimit - b.orderData.priceLimit);

    // 2. Determine Candidate Pair Matches & Double Auction Equilibrium
    const candidateMatches = [];
    let marginalBidPrice = 0.18;
    let marginalAskPrice = 0.18;
    let matchFound = false;

    // Working copies for volume allocation in this batch
    const bidWork = sortedBids.map(b => ({ ...b, remaining: b.orderData.amountKwh }));
    const askWork = sortedAsks.map(a => ({ ...a, remaining: a.orderData.amountKwh }));

    for (let bIdx = 0; bIdx < bidWork.length; bIdx++) {
      const bWrapper = bidWork[bIdx];
      if (bWrapper.remaining <= 0.1) continue;

      for (let aIdx = 0; aIdx < askWork.length; aIdx++) {
        const aWrapper = askWork[aIdx];
        if (aWrapper.remaining <= 0.1) continue;
        if (aWrapper.orderData.agentId === bWrapper.orderData.agentId) continue;

        // Condition for Double Auction crossing: Bid Price >= Ask Price
        if (bWrapper.orderData.priceLimit >= aWrapper.orderData.priceLimit) {
          const matchedVol = Math.min(bWrapper.remaining, aWrapper.remaining);
          if (matchedVol > 0.1) {
            bWrapper.remaining = Number((bWrapper.remaining - matchedVol).toFixed(2));
            aWrapper.remaining = Number((aWrapper.remaining - matchedVol).toFixed(2));

            marginalBidPrice = bWrapper.orderData.priceLimit;
            marginalAskPrice = aWrapper.orderData.priceLimit;
            matchFound = true;

            candidateMatches.push({
              bid: bWrapper,
              ask: aWrapper,
              volume: matchedVol,
              buyerId: bWrapper.orderData.agentId,
              buyerName: bWrapper.orderData.agentName,
              buyerAddress: bWrapper.orderData.agentAddress,
              sellerId: aWrapper.orderData.agentId,
              sellerName: aWrapper.orderData.agentName,
              sellerAddress: aWrapper.orderData.agentAddress,
              bidLimit: bWrapper.orderData.priceLimit,
              askLimit: aWrapper.orderData.priceLimit,
              surplusMargin: Number((bWrapper.orderData.priceLimit - aWrapper.orderData.priceLimit).toFixed(3))
            });

            if (bWrapper.remaining <= 0.1) break;
          }
        }
      }
    }

    // 3. Compute Single Uniform Clearing Price (P*) for the batch
    let uniformPrice = 0.18;
    if (matchFound && candidateMatches.length > 0) {
      // Uniform clearing price is the equilibrium midpoint between marginal cleared bid and ask
      uniformPrice = Number(((marginalBidPrice + marginalAskPrice) / 2).toFixed(3));
    } else {
      // Fallback to liquidity-depth spot pricing if no crossing occurs
      const totalAskKwh = activeAsks.reduce((sum, a) => sum + (a.orderData.amountKwh || 0), 0);
      const totalBidKwh = activeBids.reduce((sum, b) => sum + (b.orderData.amountKwh || 0), 0);
      const liquidityRatio = totalAskKwh / (totalBidKwh + 0.1);

      if (liquidityRatio > 1.4) {
        uniformPrice = Math.max(0.10, 0.18 - (liquidityRatio - 1.4) * 0.035);
      } else if (liquidityRatio < 0.8) {
        uniformPrice = Math.min(0.28, 0.18 + (0.8 - liquidityRatio) * 0.07);
      }
      uniformPrice = Number(uniformPrice.toFixed(3));
    }

    this.marketStats.uniformClearingPrice = uniformPrice;
    this.marketStats.spotPrice = uniformPrice;
    eventBroker.emit('market:spotPrice', uniformPrice);

    // 4. Physical Grid Constraints: Transformer Congestion & Economic Curtailment
    const physicsEvaluation = gridPhysics.evaluateThermalCongestion(candidateMatches);
    const { clearedMatches, curtailedMatches } = physicsEvaluation;

    let p2pVolumeThisTick = 0;
    let p2pValueThisTick = 0;
    const sellerDeliveredVolumeMap = new Map(); // Track seller delivery for imbalance verification

    // 5. Execute Cleared Double Auction Trades at Uniform Price
    for (const match of clearedMatches) {
      const tradeVolume = match.volume;
      const tradeCost = Number((tradeVolume * uniformPrice).toFixed(3));

      // Deduct settled volume from pending order pool
      const origBid = this.pendingBids.find(b => b.orderData.agentId === match.buyerId);
      const origAsk = this.pendingAsks.find(a => a.orderData.agentId === match.sellerId);
      if (origBid) origBid.orderData.amountKwh = Math.max(0, Number((origBid.orderData.amountKwh - tradeVolume).toFixed(2)));
      if (origAsk) origAsk.orderData.amountKwh = Math.max(0, Number((origAsk.orderData.amountKwh - tradeVolume).toFixed(2)));

      // Accumulate volume delivered by seller for post-tick verification
      const currDelivered = sellerDeliveredVolumeMap.get(match.sellerId) || 0;
      sellerDeliveredVolumeMap.set(match.sellerId, currDelivered + tradeVolume);

      // Generate cryptographic transaction hash
      const txHashInput = `${match.bid.signature}-${match.ask.signature}-${Date.now()}`;
      const txHash = ethers.keccak256(ethers.toUtf8Bytes(txHashInput)).slice(0, 18);

      const trade = {
        id: `tx-p2p-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        batchId,
        txHash: `0x${txHash.replace('0x', '')}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'P2P',
        clearingMechanism: 'UNIFORM_DOUBLE_AUCTION',
        buyerId: match.buyerId,
        buyerName: match.buyerName,
        buyerAddress: match.buyerAddress,
        sellerId: match.sellerId,
        sellerName: match.sellerName,
        sellerAddress: match.sellerAddress,
        amountKwh: Number(tradeVolume.toFixed(2)),
        pricePerKwh: uniformPrice,
        totalCost: tradeCost,
        status: 'Settled'
      };

      p2pVolumeThisTick += tradeVolume;
      p2pValueThisTick += tradeCost;

      currentTickTransactions.push(trade);
      currentActiveTrades.push({
        id: `trade-${match.sellerId}-${match.buyerId}-${this.tickCount}`,
        source: match.sellerId,
        target: match.buyerId,
        type: 'P2P',
        amount: Number(tradeVolume.toFixed(1)),
        price: uniformPrice
      });

      // Settle balances with EdgeAgents through event broker
      eventBroker.emit('order:settled', trade);
    }

    // 6. Record Curtailed Orders (Thermal Limit Breached)
    for (const curtailed of curtailedMatches) {
      const txHash = ethers.keccak256(ethers.toUtf8Bytes(`curtailed-${Date.now()}-${Math.random()}`)).slice(0, 18);
      const curtailRecord = {
        id: `tx-curtailed-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        batchId,
        txHash: `0x${txHash.replace('0x', '')}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'CURTAILED_FLOW',
        clearingMechanism: 'THERMAL_CONGESTION_MANAGEMENT',
        buyerId: curtailed.buyerId,
        buyerName: curtailed.buyerName,
        sellerId: curtailed.sellerId,
        sellerName: curtailed.sellerName,
        amountKwh: Number((curtailed.curtailedVolume || curtailed.volume).toFixed(2)),
        pricePerKwh: uniformPrice,
        totalCost: 0,
        status: 'Curtailed (Transformer Thermal Limit)'
      };
      currentTickTransactions.push(curtailRecord);
    }

    // 7. Imbalance Settlement Verifier (Checks Physical Generation vs Cleared ASK Commitments)
    const IMBALANCE_TARIFF_PER_KWH = 0.50; // Severe penalty tariff
    for (const [sellerId, clearedVolume] of sellerDeliveredVolumeMap.entries()) {
      const sellerAgent = nodeFactory.getAgent(sellerId);
      if (sellerAgent) {
        // Physical deliverable capacity = Instant Generation + usable Battery Storage
        const instantNetGen = Math.max(0, (sellerAgent.currentGenKW || 0) - (sellerAgent.currentLoadKW || 0));
        const usableBattery = sellerAgent.hasBattery
          ? Math.max(0, (sellerAgent.batteryKWh || 0) - (sellerAgent.maxBatteryKWh * 0.15))
          : 0;
        const totalPhysicalCapacity = instantNetGen + usableBattery;

        // If weather drift caused physical capacity to fall short of cleared ASK volume
        if (clearedVolume > (totalPhysicalCapacity + 0.5)) {
          const shortfallKwh = Number((clearedVolume - totalPhysicalCapacity).toFixed(2));
          const penaltyCost = Number((shortfallKwh * IMBALANCE_TARIFF_PER_KWH).toFixed(2));

          eventBroker.emit('agent:imbalance_penalty', {
            agentId: sellerId,
            shortfallKwh,
            tariffPerKwh: IMBALANCE_TARIFF_PER_KWH,
            penaltyCost,
            reason: 'WEATHER_DRIFT_GENERATION_SHORTFALL'
          });
        }
      }
    }

    // 8. Utility Grid Fallback for remaining unmet Bids
    const gridAgent = nodeFactory.getAgent('grid-main');
    let gridDispatchThisTick = 0;

    if (gridAgent) {
      for (const bidWrapper of this.pendingBids) {
        const bid = bidWrapper.orderData;
        if (bid.amountKwh > 0.5) {
          const gridVolume = bid.amountKwh;
          const gridCost = Number((gridVolume * gridAgent.basePrice).toFixed(3));

          const trade = {
            id: `tx-grid-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            batchId,
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

      // 9. Utility Grid Feed-In for remaining heavy surplus Asks
      for (const askWrapper of this.pendingAsks) {
        const ask = askWrapper.orderData;
        if (ask.amountKwh > 2.0) {
          const feedVolume = Number((ask.amountKwh * 0.6).toFixed(2));
          const feedEarning = Number((feedVolume * gridAgent.feedInTariff).toFixed(3));

          const trade = {
            id: `tx-feed-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            batchId,
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

    // Clean up cleared orders from active book
    this.pendingBids = this.pendingBids.filter(b => b.orderData.amountKwh > 0.1);
    this.pendingAsks = this.pendingAsks.filter(a => a.orderData.amountKwh > 0.1);

    // Update Global Transactions & Active Trades
    this.transactions = [...currentTickTransactions, ...this.transactions].slice(0, 100);
    this.activeTrades = currentActiveTrades;

    // Update Market and Physics Metrics
    const physicsState = gridPhysics.getPhysicsState();
    this.marketStats.totalP2PVolumeKwh = Number((this.marketStats.totalP2PVolumeKwh + p2pVolumeThisTick).toFixed(1));
    this.marketStats.totalP2PValueUsd = Number((this.marketStats.totalP2PValueUsd + p2pValueThisTick).toFixed(2));
    this.marketStats.activeTradesCount = currentActiveTrades.length;
    this.marketStats.gridLoadKwh = Number((20 + gridDispatchThisTick).toFixed(1));
    this.marketStats.transformerLoadKW = physicsState.transformerLoadKW;
    this.marketStats.thermalLimitKW = physicsState.thermalLimitKW;
    this.marketStats.isCongested = physicsState.isCongested;
    this.marketStats.curtailedTradesCount = physicsState.curtailedTradesCount;
    this.marketStats.totalCurtailedVolumeKwh = physicsState.totalCurtailedVolumeKwh;

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
      gridPhysics: gridPhysics.getPhysicsState(),
      clock: simulationClock.getClockState(),
      weather: this.weather,
      demandScenario: this.demandScenario,
      isPaused: this.isPaused,
      tickCount: this.tickCount
    };
  }
}

export const marketEngine = new MarketClearingEngine();
