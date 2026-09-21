import { ethers } from 'ethers';
import { eventBroker } from '../engine/eventBroker.js';

/**
 * Base Autonomous Edge Agent class.
 * Runs an independent internal execution loop with micro-jitter,
 * maintains an autonomous Ethers.js cryptographic wallet identity,
 * and signs trading orders with secp256k1 keys before broadcasting to the broker.
 */
export class EdgeAgent {
  constructor(config = {}) {
    this.id = config.id || `agent-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    this.name = config.name || 'Autonomous Edge Agent';
    this.type = config.type || 'EdgeNode';
    this.category = config.category || 'Edge';
    this.position = config.position || { x: 300, y: 300 };

    // Cryptographic Wallet Identity (Ethers.js)
    if (config.privateKey) {
      this.wallet = new ethers.Wallet(config.privateKey);
    } else {
      this.wallet = ethers.Wallet.createRandom();
    }
    this.address = this.wallet.address;
    this.privateKey = this.wallet.privateKey;

    // Financials & Energy
    this.walletBalance = typeof config.walletBalance === 'number' ? config.walletBalance : 500.00;
    this.battery = typeof config.battery === 'number' ? config.battery : 25.0;
    this.maxBattery = typeof config.maxBattery === 'number' ? config.maxBattery : 50.0;
    this.solarGeneration = 0.0;
    this.loadConsumption = 0.0;
    this.tradingStatus = 'Idle';
    this.strategy = config.strategy || 'Autonomous Edge Optimization';
    this.history = config.history || [];

    // Environmental state
    this.weather = 'Sunny';
    this.demandScenario = 'Normal';
    this.isPaused = false;
    this.spotPrice = 0.18;

    // Internal independent physics loop config
    this.isRunning = false;
    this.baseIntervalMs = config.baseIntervalMs || 2800;
    this.timerId = null;
    this.nonce = 0;

    // Listen to broker events
    this.setupBrokerSubscriptions();
  }

  setupBrokerSubscriptions() {
    this._onWeather = (weather) => {
      this.weather = weather;
    };
    this._onDemand = (demand) => {
      this.demandScenario = demand;
    };
    this._onPause = (isPaused) => {
      this.isPaused = isPaused;
    };
    this._onSpotPrice = (price) => {
      this.spotPrice = price;
    };
    this._onSettled = (trade) => {
      if (trade.buyerId === this.id || trade.sellerId === this.id) {
        this.handleSettlement(trade);
      }
    };

    eventBroker.on('env:weather', this._onWeather);
    eventBroker.on('env:demand', this._onDemand);
    eventBroker.on('grid:pause', this._onPause);
    eventBroker.on('market:spotPrice', this._onSpotPrice);
    eventBroker.on('order:settled', this._onSettled);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.scheduleNextTick();
  }

  stop() {
    this.isRunning = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  destroy() {
    this.stop();
    eventBroker.off('env:weather', this._onWeather);
    eventBroker.off('env:demand', this._onDemand);
    eventBroker.off('grid:pause', this._onPause);
    eventBroker.off('market:spotPrice', this._onSpotPrice);
    eventBroker.off('order:settled', this._onSettled);
    eventBroker.emit('agent:destroyed', { id: this.id });
  }

  scheduleNextTick() {
    if (!this.isRunning) return;
    // Introduce ±400ms micro-jitter to model real asynchronous edge hardware
    const jitter = (Math.random() * 800) - 400;
    const interval = Math.max(1200, this.baseIntervalMs + jitter);

    this.timerId = setTimeout(async () => {
      try {
        if (!this.isPaused) {
          await this.tick();
        }
      } catch (err) {
        console.error(`[Agent ${this.id}] Error in execution loop:`, err);
      } finally {
        this.scheduleNextTick();
      }
    }, interval);
  }

  async tick() {
    this.updatePhysics();
    const order = await this.evaluateStrategy();
    if (order) {
      await this.signAndPublishOrder(order);
    }
    this.publishTelemetry();
  }

  updatePhysics() {
    // Implemented by subclasses
  }

  async evaluateStrategy() {
    // Implemented by subclasses - returns order payload or null
    return null;
  }

  /**
   * Cryptographically sign the order with secp256k1 Ethereum private key
   */
  async signAndPublishOrder(orderPayload) {
    this.nonce++;
    const orderData = {
      ...orderPayload,
      agentId: this.id,
      agentName: this.name,
      agentAddress: this.address,
      nonce: this.nonce,
      timestamp: Date.now()
    };

    // Serialize deterministic string for cryptographic signing
    const messageToSign = JSON.stringify(orderData);
    const signature = await this.wallet.signMessage(messageToSign);

    const signedOrder = {
      orderData,
      signature,
      agentAddress: this.address
    };

    eventBroker.emit('order:submit', signedOrder);
  }

  handleSettlement(trade) {
    const isBuyer = trade.buyerId === this.id;
    const isSeller = trade.sellerId === this.id;

    if (isBuyer) {
      this.walletBalance = Number((this.walletBalance - trade.totalCost).toFixed(2));
      this.battery = Math.min(this.maxBattery, Number((this.battery + trade.amountKwh * 0.4).toFixed(2)));
    } else if (isSeller) {
      this.walletBalance = Number((this.walletBalance + trade.totalCost).toFixed(2));
      this.battery = Math.max(0, Number((this.battery - trade.amountKwh * 0.4).toFixed(2)));
    }

    // Append to local audit ledger
    this.history = [trade, ...(this.history || [])].slice(0, 20);
    this.publishTelemetry();
  }

  publishTelemetry() {
    eventBroker.emit('telemetry', this.toJSON());
  }

  updateSettings(newSettings) {
    Object.assign(this, newSettings);
    this.publishTelemetry();
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      category: this.category,
      position: this.position,
      address: this.address,
      walletBalance: this.walletBalance,
      battery: this.battery,
      maxBattery: this.maxBattery,
      solarGeneration: this.solarGeneration,
      loadConsumption: this.loadConsumption,
      tradingStatus: this.tradingStatus,
      strategy: this.strategy,
      minBatteryReserve: this.minBatteryReserve,
      targetSellPrice: this.targetSellPrice,
      maxBuyPrice: this.maxBuyPrice,
      stats: this.stats,
      history: this.history
    };
  }
}

/**
 * Prosumer Agent: Generates solar energy, supplies local home/office load,
 * and autonomically sells surplus energy above battery reserve threshold.
 */
export class ProsumerAgent extends EdgeAgent {
  constructor(config = {}) {
    super({
      ...config,
      type: 'ProsumerNode',
      category: 'Prosumer',
      walletBalance: config.walletBalance ?? 350.00,
      battery: config.battery ?? 35.0,
      maxBattery: config.maxBattery ?? 50.0
    });
    this.baseSolar = config.baseSolar || (this.id === 'prosumer-1' ? 8.0 : this.id === 'prosumer-2' ? 16.5 : 25.0);
    this.baseLoad = config.baseLoad || (this.id === 'prosumer-1' ? 2.2 : this.id === 'prosumer-2' ? 4.8 : 3.5);
    this.minBatteryReserve = typeof config.minBatteryReserve === 'number' ? config.minBatteryReserve : 50;
    this.targetSellPrice = typeof config.targetSellPrice === 'number' ? config.targetSellPrice : 0.15;
  }

  updatePhysics() {
    let solarMultiplier = 1.0;
    if (this.weather === 'Sunny') solarMultiplier = 1.0 + (Math.random() * 0.2 - 0.1);
    else if (this.weather === 'Cloudy') solarMultiplier = 0.45 + (Math.random() * 0.15);
    else if (this.weather === 'Solar Surge') solarMultiplier = 1.65 + (Math.random() * 0.3);

    let demandMultiplier = 1.0;
    if (this.demandScenario === 'Normal') demandMultiplier = 1.0 + (Math.random() * 0.2 - 0.1);
    else if (this.demandScenario === 'Peak Surge') demandMultiplier = 1.5 + (Math.random() * 0.3);

    const jitter = (Math.random() * 1.0 - 0.5);
    this.solarGeneration = Math.max(0.2, Number((this.baseSolar * solarMultiplier + jitter).toFixed(2)));
    this.loadConsumption = Math.max(0.4, Number((this.baseLoad * demandMultiplier + (Math.random() * 0.6 - 0.3)).toFixed(2)));

    const netPower = this.solarGeneration - this.loadConsumption;
    if (netPower > 0) {
      this.battery = Math.min(this.maxBattery, Number((this.battery + netPower * 0.25).toFixed(2)));
    } else {
      this.battery = Math.max(0, Number((this.battery + netPower * 0.25).toFixed(2)));
    }
  }

  async evaluateStrategy() {
    const reserveKwh = (this.minBatteryReserve / 100) * this.maxBattery;
    const tradeableSurplus = Math.max(0, this.battery - reserveKwh);
    const netInstant = this.solarGeneration - this.loadConsumption;

    if (tradeableSurplus > 1.0 && netInstant > 0) {
      this.tradingStatus = 'Selling';
      return {
        side: 'ASK',
        amountKwh: Number(Math.min(tradeableSurplus, netInstant * 1.6).toFixed(2)),
        priceLimit: Number(this.targetSellPrice.toFixed(3))
      };
    } else if (this.battery >= this.maxBattery * 0.95) {
      this.tradingStatus = 'Feeding Grid';
      return {
        side: 'ASK',
        amountKwh: Number((netInstant * 0.8).toFixed(2)),
        priceLimit: 0.10
      };
    } else {
      this.tradingStatus = 'Charging';
      return null;
    }
  }
}

/**
 * Consumer Agent: Datacenters, EV charging hubs, residential districts.
 * Requires consistent power and issues signed BID orders to buy lowest-cost green energy.
 */
export class ConsumerAgent extends EdgeAgent {
  constructor(config = {}) {
    super({
      ...config,
      type: 'ConsumerNode',
      category: 'Consumer',
      walletBalance: config.walletBalance ?? 1000.00,
      battery: config.battery ?? 20.0,
      maxBattery: config.maxBattery ?? 60.0
    });
    this.baseLoad = config.baseLoad || (this.id === 'consumer-1' ? 16.5 : this.id === 'consumer-2' ? 13.0 : 8.5);
    this.maxBuyPrice = typeof config.maxBuyPrice === 'number' ? config.maxBuyPrice : 0.26;
  }

  updatePhysics() {
    let demandMultiplier = 1.0;
    if (this.demandScenario === 'Normal') demandMultiplier = 1.0 + (Math.random() * 0.2 - 0.1);
    else if (this.demandScenario === 'Peak Surge') demandMultiplier = 1.6 + (Math.random() * 0.4);

    this.solarGeneration = 0;
    this.loadConsumption = Math.max(1.0, Number((this.baseLoad * demandMultiplier + (Math.random() * 1.5 - 0.75)).toFixed(2)));
    this.battery = Math.max(1.5, Number((this.battery - this.loadConsumption * 0.2).toFixed(2)));
  }

  async evaluateStrategy() {
    const neededKwh = Number((this.loadConsumption * 0.75 + Math.max(0, (this.maxBattery * 0.4 - this.battery))).toFixed(2));

    if (neededKwh > 0.8) {
      this.tradingStatus = 'Buying';
      return {
        side: 'BID',
        amountKwh: neededKwh,
        priceLimit: Number(this.maxBuyPrice.toFixed(3))
      };
    } else {
      this.tradingStatus = 'Idle';
      return null;
    }
  }
}

/**
 * SolarFarm Agent: High-capacity commercial solar array.
 * Dedicated wholesale green energy supplier.
 */
export class SolarFarmAgent extends EdgeAgent {
  constructor(config = {}) {
    super({
      ...config,
      type: 'SolarFarmNode',
      category: 'SolarFarm',
      walletBalance: config.walletBalance ?? 2500.00,
      battery: config.battery ?? 120.0,
      maxBattery: config.maxBattery ?? 200.0
    });
    this.baseSolar = config.baseSolar || 65.0; // kW
    this.baseLoad = config.baseLoad || 1.5; // kW
    this.minBatteryReserve = typeof config.minBatteryReserve === 'number' ? config.minBatteryReserve : 30;
    this.targetSellPrice = typeof config.targetSellPrice === 'number' ? config.targetSellPrice : 0.13;
  }

  updatePhysics() {
    let solarMultiplier = 1.0;
    if (this.weather === 'Sunny') solarMultiplier = 1.0 + (Math.random() * 0.25 - 0.1);
    else if (this.weather === 'Cloudy') solarMultiplier = 0.4 + (Math.random() * 0.15);
    else if (this.weather === 'Solar Surge') solarMultiplier = 1.7 + (Math.random() * 0.35);

    this.solarGeneration = Math.max(2.0, Number((this.baseSolar * solarMultiplier + (Math.random() * 2.0 - 1.0)).toFixed(2)));
    this.loadConsumption = Math.max(0.5, Number((this.baseLoad + (Math.random() * 0.4 - 0.2)).toFixed(2)));

    const netPower = this.solarGeneration - this.loadConsumption;
    if (netPower > 0) {
      this.battery = Math.min(this.maxBattery, Number((this.battery + netPower * 0.2).toFixed(2)));
    }
  }

  async evaluateStrategy() {
    const surplus = this.solarGeneration - this.loadConsumption;
    if (surplus > 2.0) {
      this.tradingStatus = 'Selling';
      return {
        side: 'ASK',
        amountKwh: Number((surplus * 0.9).toFixed(2)),
        priceLimit: Number(this.targetSellPrice.toFixed(3))
      };
    }
    this.tradingStatus = 'Charging';
    return null;
  }
}

/**
 * BESS Agent: Battery Energy Storage System.
 * Performs grid arbitrage (buys when spot price is cheap, sells when price surges).
 */
export class BESSAgent extends EdgeAgent {
  constructor(config = {}) {
    super({
      ...config,
      type: 'BESSNode',
      category: 'BESS',
      walletBalance: config.walletBalance ?? 3000.00,
      battery: config.battery ?? 80.0,
      maxBattery: config.maxBattery ?? 150.0
    });
    this.chargeThresholdPrice = config.chargeThresholdPrice || 0.14; // Buy below this price
    this.dischargeThresholdPrice = config.dischargeThresholdPrice || 0.22; // Sell above this price
    this.minReserve = 20; // %
  }

  updatePhysics() {
    // Parasitic cooling loss
    this.solarGeneration = 0;
    this.loadConsumption = Number((0.5 + Math.random() * 0.3).toFixed(2));
    this.battery = Math.max(0, Number((this.battery - 0.05).toFixed(2)));
  }

  async evaluateStrategy() {
    const socPercent = (this.battery / this.maxBattery) * 100;

    // Price is high and we have stored charge -> Sell/Discharge
    if (this.spotPrice >= this.dischargeThresholdPrice && socPercent > this.minReserve) {
      this.tradingStatus = 'Discharging';
      const dischargeAmount = Math.min(25.0, (this.battery - (this.minReserve / 100) * this.maxBattery));
      return {
        side: 'ASK',
        amountKwh: Number(dischargeAmount.toFixed(2)),
        priceLimit: Number(this.spotPrice.toFixed(3))
      };
    }

    // Price is cheap and we have capacity -> Buy/Charge
    if (this.spotPrice <= this.chargeThresholdPrice && socPercent < 90) {
      this.tradingStatus = 'Charging';
      const capacityAvailable = this.maxBattery - this.battery;
      const chargeAmount = Math.min(20.0, capacityAvailable);
      return {
        side: 'BID',
        amountKwh: Number(chargeAmount.toFixed(2)),
        priceLimit: Number(this.chargeThresholdPrice.toFixed(3))
      };
    }

    this.tradingStatus = 'Idle';
    return null;
  }
}

/**
 * GridAgent: Metro Substation / Utility Grid.
 * Base station fallback and grid telemetry aggregator.
 */
export class GridAgent extends EdgeAgent {
  constructor(config = {}) {
    super({
      ...config,
      id: config.id || 'grid-main',
      name: config.name || 'Metro Substation Alpha',
      type: 'GridNode',
      category: 'UtilityGrid',
      position: config.position || { x: 450, y: 240 }
    });
    this.capacity = config.capacity || 1000;
    this.currentDispatch = 24.5;
    this.basePrice = config.basePrice || 0.32;
    this.feedInTariff = config.feedInTariff || 0.08;
    this.status = 'Operational';
    this.stability = 99.8;
    this.stats = config.stats || {
      totalDispatchedKwh: 1240.5,
      totalAbsorbedKwh: 310.2,
      carbonOffsetKg: 850.4
    };
  }

  updatePhysics() {
    // Grid stability slight variance
    this.stability = Number((99.7 + Math.random() * 0.25).toFixed(1));
  }

  async evaluateStrategy() {
    // Utility grid does not submit speculative orders; it provides fallback liquidity in the matching engine
    return null;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      category: this.category,
      address: this.address,
      position: this.position,
      capacity: this.capacity,
      currentDispatch: this.currentDispatch,
      basePrice: this.basePrice,
      feedInTariff: this.feedInTariff,
      status: this.status,
      stability: this.stability,
      stats: this.stats,
      walletBalance: 99999.00
    };
  }
}
