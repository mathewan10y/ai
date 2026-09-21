import { ethers } from 'ethers';
import { eventBroker } from '../engine/eventBroker.js';
import { QLearningBrain } from './QLearningBrain.js';
import { weatherService } from '../services/WeatherService.js';

/**
 * Autonomous Edge Agent with an independent Q-Learning Brain and Ethers.js Wallet
 */
export class EdgeAgent {
  constructor(config = {}) {
    this.id = config.id || `agent-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    this.name = config.name || 'Autonomous Edge Agent';
    this.type = config.type || 'ProsumerNode';
    this.category = config.category || 'Prosumer';
    this.position = config.position || { x: 300, y: 300 };

    // Geographical Location (Open-Meteo Telemetry)
    this.latitude = typeof config.latitude === 'number' ? config.latitude : 37.7749;
    this.longitude = typeof config.longitude === 'number' ? config.longitude : -122.4194;
    this.weatherTelemetry = {
      shortwaveRadiation: 650,
      cloudCover: 15,
      solarForecast: 'FORECAST_CLEAR',
      hourlyRadiation: [600, 450, 200],
      isLive: false
    };

    // Cryptographic Wallet Identity (Ethers.js)
    if (config.privateKey) {
      this.wallet = new ethers.Wallet(config.privateKey);
    } else {
      this.wallet = ethers.Wallet.createRandom();
    }
    this.address = this.wallet.address;
    this.privateKey = this.wallet.privateKey;

    // Financials & Balances
    this.walletBalance = typeof config.walletBalance === 'number' ? config.walletBalance : 500.00;
    this.lcosPerKWh = typeof config.lcosPerKWh === 'number' ? config.lcosPerKWh : 0.04;
    this.totalLcosCostUsd = 0.0;
    this.totalImbalancePenaltiesUsd = 0.0;

    // Battery / Storage Configuration
    this.maxBatteryKWh = typeof config.maxBattery === 'number' ? config.maxBattery : (typeof config.maxBatteryKWh === 'number' ? config.maxBatteryKWh : 50.0);
    this.hasBattery = this.maxBatteryKWh > 0;
    this.batteryKWh = this.hasBattery
      ? (typeof config.battery === 'number' ? config.battery : (typeof config.batteryKWh === 'number' ? config.batteryKWh : this.maxBatteryKWh * 0.6))
      : 0;

    // Generation & Load Configuration
    this.baseGenKW = typeof config.baseSolar === 'number' ? config.baseSolar : (typeof config.baseGenKW === 'number' ? config.baseGenKW : 0);
    this.baseLoadKW = typeof config.baseLoad === 'number' ? config.baseLoad : (typeof config.baseLoadKW === 'number' ? config.baseLoadKW : 4.0);
    this.currentGenKW = 0.0;
    this.currentLoadKW = 0.0;
    this.deferrableLoadKWh = typeof config.deferrableLoadKWh === 'number' ? config.deferrableLoadKWh : (this.category === 'Consumer' ? 12.0 : 4.0);
    this.curtailed = false;

    // Trading Strategy Thresholds & RL Diagnostics
    this.tradingStatus = 'Idle';
    this.currentAction = 'HOLD';
    this.isExploration = false;
    this.qValues = [];
    this.gridCycle = config.gridCycle || 'SOLAR_GLUT';
    this.simTime = 'Day 1 - 08:00';
    this.stateKey = 'BALANCED|NO_BATTERY|MID|TASK_DONE|FORECAST_CLEAR|SOLAR_GLUT';
    this.prevStateKey = null;
    this.prevAction = null;
    this.history = config.history || [];

    // Environmental state
    this.weather = 'Sunny';
    this.demandScenario = 'Normal';
    this.isPaused = false;
    this.spotPrice = 0.18;
    this.retailGridPrice = 0.32;

    // Independent Q-Learning Brain
    this.brain = new QLearningBrain({
      alpha: 0.1,
      gamma: 0.9,
      epsilon: typeof config.epsilon === 'number' ? config.epsilon : 0.25,
      epsilonDecay: 0.995
    });

    // Independent Timer configuration
    this.isRunning = false;
    this.baseIntervalMs = config.baseIntervalMs || 2600;
    this.timerId = null;
    this.nonce = 0;
    this.lastSettlementTimestamp = 0;
    this.tradeCooldownMs = 2000;

    this.setupBrokerSubscriptions();
  }

  setupBrokerSubscriptions() {
    this._onWeather = (weather) => { this.weather = weather; };
    this._onDemand = (demand) => { this.demandScenario = demand; };
    this._onPause = (isPaused) => { this.isPaused = isPaused; };
    this._onSpotPrice = (price) => { this.spotPrice = price; };
    this._onClock = (clockState) => {
      if (clockState) {
        this.gridCycle = clockState.gridCycle || this.gridCycle;
        this.simTime = clockState.timeString || this.simTime;
      }
    };
    this._onSettled = (trade) => {
      if (trade.buyerId === this.id || trade.sellerId === this.id) {
        this.handleSettlement(trade);
      }
    };
    this._onImbalance = (penaltyData) => {
      if (penaltyData && penaltyData.agentId === this.id) {
        this.handleImbalancePenalty(penaltyData);
      }
    };

    eventBroker.on('env:weather', this._onWeather);
    eventBroker.on('env:demand', this._onDemand);
    eventBroker.on('grid:pause', this._onPause);
    eventBroker.on('market:spotPrice', this._onSpotPrice);
    eventBroker.on('clock:tick', this._onClock);
    eventBroker.on('order:settled', this._onSettled);
    eventBroker.on('agent:imbalance_penalty', this._onImbalance);
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
    eventBroker.off('clock:tick', this._onClock);
    eventBroker.off('order:settled', this._onSettled);
    eventBroker.off('agent:imbalance_penalty', this._onImbalance);
    eventBroker.emit('agent:destroyed', { id: this.id });
  }

  scheduleNextTick() {
    if (!this.isRunning) return;
    // Micro-jitter ±350ms to model real asynchronous edge computing
    const jitter = (Math.random() * 700) - 350;
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
    // 1. Update local physical generation & base load from localized weather telemetry & diurnal clock
    await this.updatePhysics();

    const netPowerKW = this.currentGenKW - this.currentLoadKW;

    // 2. Discretize current state for Q-Learning (including 3-hour solar lookahead & GridCycle)
    const currentStateKey = this.brain.discretizeState({
      netPowerKW,
      batteryKWh: this.batteryKWh,
      maxBatteryKWh: this.maxBatteryKWh,
      hasBattery: this.hasBattery,
      spotPrice: this.spotPrice,
      deferrableLoadKWh: this.deferrableLoadKWh,
      solarForecast: this.weatherTelemetry?.solarForecast || 'FORECAST_CLEAR',
      gridCycle: this.gridCycle
    });

    const validActions = this.brain.getValidActions({
      hasBattery: this.hasBattery,
      isSurplus: netPowerKW > 0.5,
      deferrableLoadKWh: this.deferrableLoadKWh
    });

    // 3. Select action via Epsilon-Greedy policy
    const decision = this.brain.selectAction(currentStateKey, validActions);
    this.currentAction = decision.action;
    this.isExploration = decision.isExploration;
    this.stateKey = currentStateKey;
    this.qValues = this.brain.getQValues(currentStateKey, validActions);

    // 4. Execute physical and market actions based on RL decision
    let immediateReward = 0;
    let orderToSign = null;

    switch (this.currentAction) {
      case 'HOLD':
        this.curtailed = false;
        this.tradingStatus = this.hasBattery ? 'Holding' : 'Idle';
        // If surplus solar, gently top up battery
        if (this.hasBattery && netPowerKW > 0) {
          this.batteryKWh = Math.min(this.maxBatteryKWh, Number((this.batteryKWh + netPowerKW * 0.2).toFixed(2)));
        }
        break;

      case 'CHARGE_OPPORTUNISTIC':
        this.curtailed = false;
        if (this.hasBattery && this.batteryKWh < this.maxBatteryKWh) {
          this.tradingStatus = 'Charging';
          const neededKwh = Math.min(15.0, Number((this.maxBatteryKWh - this.batteryKWh).toFixed(2)));
          if (neededKwh > 0.5) {
            orderToSign = {
              side: 'BID',
              amountKwh: neededKwh,
              priceLimit: Number(Math.min(0.24, this.spotPrice + 0.01).toFixed(3))
            };
          }
          // Strategic incentive: charging during SOLAR_GLUT when green solar is peak
          if (this.gridCycle === 'SOLAR_GLUT') {
            immediateReward += 0.30;
          }
          // If preemptively charging ahead of a solar drop, reward anticipatory behavior
          if (this.weatherTelemetry?.solarForecast === 'FORECAST_DROP') {
            immediateReward += 0.25;
          }
        }
        break;

      case 'DISCHARGE_MAX_PROFIT':
        this.curtailed = false;
        if (this.hasBattery && this.batteryKWh > (this.maxBatteryKWh * 0.2)) {
          this.tradingStatus = 'Discharging';
          const surplusKwh = Number((this.batteryKWh - (this.maxBatteryKWh * 0.2)).toFixed(2));
          // Apply safety margin (bidding 85% of available headroom to prevent shortfall)
          const tradeVolume = Math.min(20.0, Number((surplusKwh * 0.85).toFixed(2)));
          
          if (tradeVolume > 0.5) {
            // Price floor incorporates LCOS degradation cost
            const minFloorPrice = Number((this.lcosPerKWh + 0.06).toFixed(3));
            orderToSign = {
              side: 'ASK',
              amountKwh: tradeVolume,
              priceLimit: Number(Math.max(minFloorPrice, this.spotPrice - 0.01).toFixed(3))
            };
          }

          // STRATEGIC OPPORTUNITY COST:
          // Discharging during SOLAR_GLUT is severely penalized so agent learns to hold for EVENING_PEAK
          if (this.gridCycle === 'SOLAR_GLUT') {
            immediateReward -= 0.45;
          } else if (this.gridCycle === 'EVENING_PEAK') {
            immediateReward += 0.35;
          }
        }
        break;

      case 'SHIFT_LOAD_ON':
        this.curtailed = false;
        this.tradingStatus = 'Absorbing Demand';
        if (this.deferrableLoadKWh > 0) {
          // Increase load consumption temporarily to consume cheap green energy
          const consumedBatch = Math.min(3.0, this.deferrableLoadKWh);
          this.currentLoadKW += 4.5;
          this.deferrableLoadKWh = Math.max(0, Number((this.deferrableLoadKWh - consumedBatch).toFixed(2)));
          // Positive reward for clearing deferrable tasks when market price is low/mid or during solar glut
          immediateReward += (this.spotPrice < 0.18 || this.gridCycle === 'SOLAR_GLUT' ? 0.35 : 0.10);
        }
        break;

      case 'SHIFT_LOAD_OFF':
        this.curtailed = false;
        this.tradingStatus = 'Shedding Load';
        this.currentLoadKW = Math.max(0.5, Number((this.currentLoadKW * 0.65).toFixed(2)));
        // Reward for avoiding peak pricing during evening peak
        if (this.spotPrice > 0.20 || this.gridCycle === 'EVENING_PEAK') {
          immediateReward += 0.30;
        }
        break;

      case 'CURTAIL_SOLAR':
        this.curtailed = true;
        this.tradingStatus = 'Curtailed';
        this.currentGenKW = 0; // Throttle inverter to zero export
        // Penalty for wasting potential green solar generation
        immediateReward -= 0.20;
        break;

      case 'MARKET_TAKER':
      default:
        this.curtailed = false;
        if (netPowerKW < -0.5) {
          this.tradingStatus = 'Buying';
          const neededKwh = Math.abs(netPowerKW);
          orderToSign = {
            side: 'BID',
            amountKwh: Number(neededKwh.toFixed(2)),
            priceLimit: Number((this.retailGridPrice * 0.95).toFixed(3))
          };
        } else if (netPowerKW > 0.5) {
          this.tradingStatus = 'Selling';
          // Conservative safety margin (88% of net power) to guard against weather drift shortfall
          const safeSurplus = Number((netPowerKW * 0.88).toFixed(2));
          if (safeSurplus > 0.3) {
            orderToSign = {
              side: 'ASK',
              amountKwh: safeSurplus,
              priceLimit: Number(Math.max(0.11, this.spotPrice).toFixed(3))
            };
          }
        } else {
          this.tradingStatus = 'Balanced';
        }
        break;
    }

    // 5. Submit cryptographically signed order if market order was constructed and not on cooldown
    const isCoolingDown = (Date.now() - this.lastSettlementTimestamp) < this.tradeCooldownMs;
    if (orderToSign && orderToSign.amountKwh > 0.2 && !isCoolingDown) {
      await this.signAndPublishOrder(orderToSign);
    }

    // 6. Learn from state transition and immediate reward
    if (this.prevStateKey && this.prevAction) {
      this.brain.learn(this.prevStateKey, this.prevAction, immediateReward, currentStateKey, validActions);
    }
    this.prevStateKey = currentStateKey;
    this.prevAction = this.currentAction;

    // 7. Broadcast telemetry
    this.publishTelemetry();
  }

  async updatePhysics() {
    // 1. Fetch real-world / cached Open-Meteo telemetry for agent coordinates
    try {
      this.weatherTelemetry = await weatherService.getTelemetry(this.latitude, this.longitude);
    } catch (err) {
      console.warn(`[Agent ${this.id}] Weather fetch fallback:`, err.message);
    }

    // 2. Physical Solar Generation based on Shortwave Radiation (W/m²), Cloud Cover (%), and Macro GridCycle
    let diurnalSolarMult = 1.0;
    if (this.gridCycle === 'MORNING_RAMP') diurnalSolarMult = 0.65;
    else if (this.gridCycle === 'SOLAR_GLUT') diurnalSolarMult = 1.25;
    else if (this.gridCycle === 'EVENING_PEAK') diurnalSolarMult = 0.25;
    else if (this.gridCycle === 'OFF_PEAK_NIGHT') diurnalSolarMult = 0.0;

    if (this.baseGenKW > 0) {
      const radiationRatio = Math.max(0, (this.weatherTelemetry.shortwaveRadiation || 0) / 750);
      const cloudFactor = Math.max(0.15, 1 - ((this.weatherTelemetry.cloudCover || 0) / 160));
      const genJitter = (Math.random() * 0.4) - 0.2;
      this.currentGenKW = Math.max(0, Number((this.baseGenKW * radiationRatio * cloudFactor * diurnalSolarMult + genJitter).toFixed(2)));
    } else {
      this.currentGenKW = 0;
    }

    // 3. Base Load & Demand Multiplier
    let demandMultiplier = 1.0;
    if (this.gridCycle === 'EVENING_PEAK') demandMultiplier = 1.45;
    else if (this.gridCycle === 'OFF_PEAK_NIGHT') demandMultiplier = 0.65;
    else if (this.gridCycle === 'MORNING_RAMP') demandMultiplier = 1.10;

    if (this.demandScenario === 'Peak Surge') demandMultiplier *= 1.4;

    const loadJitter = (Math.random() * 0.6) - 0.3;
    this.currentLoadKW = Math.max(0.4, Number((this.baseLoadKW * demandMultiplier + loadJitter).toFixed(2)));

    // Regenerate deferrable load periodically (e.g. new EV plug-in or washing cycle)
    if (this.deferrableLoadKWh <= 0.5 && Math.random() < 0.15) {
      this.deferrableLoadKWh = Number((5.0 + Math.random() * 10.0).toFixed(1));
    }
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
    let reward = 0;

    if (isBuyer) {
      this.walletBalance = Number((this.walletBalance - trade.totalCost).toFixed(2));
      if (this.hasBattery) {
        this.batteryKWh = Math.min(this.maxBatteryKWh, Number((this.batteryKWh + trade.amountKwh * 0.4).toFixed(2)));
      }
      // Reward = Cost savings vs Utility Grid retail tariff
      const avoidedGridCost = trade.amountKwh * this.retailGridPrice;
      const savings = avoidedGridCost - trade.totalCost;
      reward = Number((savings * 1.5).toFixed(3)); // Positive reinforcement for cheap green imports
    } else if (isSeller) {
      this.walletBalance = Number((this.walletBalance + trade.totalCost).toFixed(2));
      
      let degradationCost = 0;
      if (this.hasBattery) {
        this.batteryKWh = Math.max(0, Number((this.batteryKWh - trade.amountKwh * 0.4).toFixed(2)));
        // LCOS Levelized Cost of Storage deduction
        degradationCost = Number((trade.amountKwh * this.lcosPerKWh).toFixed(3));
        this.totalLcosCostUsd = Number((this.totalLcosCostUsd + degradationCost).toFixed(2));
      }

      // Net trade revenue after LCOS degradation
      const netRevenue = Math.max(0, trade.totalCost - degradationCost);
      reward = Number((netRevenue * 1.2).toFixed(3));

      // Strategic opportunity cost modification on actual settlement
      if (this.gridCycle === 'SOLAR_GLUT') {
        reward -= 0.30;
      } else if (this.gridCycle === 'EVENING_PEAK') {
        reward += 0.25;
      }
    }

    // Trigger Bellman learning update upon market settlement
    if (this.stateKey && this.currentAction) {
      const validActions = this.brain.getValidActions({
        hasBattery: this.hasBattery,
        isSurplus: (this.currentGenKW - this.currentLoadKW) > 0.5,
        deferrableLoadKWh: this.deferrableLoadKWh
      });
      this.brain.learn(this.stateKey, this.currentAction, reward, this.stateKey, validActions);
    }

    this.lastSettlementTimestamp = Date.now();
    this.history = [trade, ...(this.history || [])].slice(0, 20);
    this.publishTelemetry();
  }

  handleImbalancePenalty(penaltyData) {
    const { shortfallKwh, tariffPerKwh, penaltyCost, reason } = penaltyData;
    this.walletBalance = Number((this.walletBalance - penaltyCost).toFixed(2));
    this.totalImbalancePenaltiesUsd = Number((this.totalImbalancePenaltiesUsd + penaltyCost).toFixed(2));

    // Feed directly into negative RL reward so agent learns conservative bidding
    const negativeReward = -Number((penaltyCost * 2.0).toFixed(3));
    const validActions = this.brain.getValidActions({
      hasBattery: this.hasBattery,
      isSurplus: false,
      deferrableLoadKWh: this.deferrableLoadKWh
    });
    this.brain.learn(this.stateKey, this.currentAction, negativeReward, this.stateKey, validActions);

    const penaltyRecord = {
      id: `tx-penalty-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toLocaleTimeString(),
      type: 'IMBALANCE_PENALTY',
      sellerId: this.id,
      sellerName: this.name,
      buyerId: 'grid-main',
      buyerName: 'Utility Grid (Imbalance Tariff)',
      amountKwh: shortfallKwh,
      pricePerKwh: tariffPerKwh,
      totalCost: penaltyCost,
      status: 'Shortfall Tariff Incurred'
    };

    this.history = [penaltyRecord, ...(this.history || [])].slice(0, 20);
    this.publishTelemetry();
  }

  publishTelemetry() {
    eventBroker.emit('telemetry', this.toJSON());
  }

  updateSettings(newSettings) {
    if (typeof newSettings.baseLoadKW === 'number') this.baseLoadKW = newSettings.baseLoadKW;
    if (typeof newSettings.baseGenKW === 'number') this.baseGenKW = newSettings.baseGenKW;
    if (typeof newSettings.latitude === 'number') this.latitude = newSettings.latitude;
    if (typeof newSettings.longitude === 'number') this.longitude = newSettings.longitude;
    if (typeof newSettings.epsilon === 'number') this.brain.epsilon = newSettings.epsilon;
    if (newSettings.strategy) this.strategy = newSettings.strategy;
    this.publishTelemetry();
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      category: this.category,
      position: this.position,
      latitude: this.latitude,
      longitude: this.longitude,
      weather: this.weatherTelemetry,
      address: this.address,
      walletBalance: this.walletBalance,
      lcosPerKWh: this.lcosPerKWh,
      totalLcosCostUsd: this.totalLcosCostUsd,
      totalImbalancePenaltiesUsd: this.totalImbalancePenaltiesUsd,
      hasBattery: this.hasBattery,
      battery: this.batteryKWh,
      batteryKWh: this.batteryKWh,
      maxBattery: this.maxBatteryKWh,
      maxBatteryKWh: this.maxBatteryKWh,
      solarGeneration: this.currentGenKW,
      currentGenKW: this.currentGenKW,
      loadConsumption: this.currentLoadKW,
      currentLoadKW: this.currentLoadKW,
      deferrableLoadKWh: this.deferrableLoadKWh,
      curtailed: this.curtailed,
      tradingStatus: this.tradingStatus,
      currentAction: this.currentAction,
      isExploration: this.isExploration,
      epsilon: this.brain.epsilon,
      qValues: this.qValues,
      gridCycle: this.gridCycle,
      simTime: this.simTime,
      stateKey: this.stateKey,
      stats: this.stats,
      history: this.history
    };
  }
}

/**
 * Utility Grid Substation Agent (Main Grid Node)
 */
export class GridAgent extends EdgeAgent {
  constructor(config = {}) {
    super({
      ...config,
      id: config.id || 'grid-main',
      name: config.name || 'Metro Substation Alpha',
      type: 'GridNode',
      category: 'UtilityGrid',
      position: config.position || { x: 450, y: 240 },
      maxBattery: 0,
      baseSolar: 0,
      baseLoad: 0
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
    this.stability = Number((99.7 + Math.random() * 0.25).toFixed(1));
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
