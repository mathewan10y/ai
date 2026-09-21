/**
 * Independent Tabular Q-Learning Brain for Autonomous Edge Agents.
 * Implements Bellman Equation updates:
 * Q(s, a) = Q(s, a) + alpha * [Reward + gamma * max_a' Q(s', a') - Q(s, a)]
 */
export class QLearningBrain {
  constructor(config = {}) {
    this.alpha = typeof config.alpha === 'number' ? config.alpha : 0.1; // Learning rate
    this.gamma = typeof config.gamma === 'number' ? config.gamma : 0.9; // Discount factor
    this.epsilon = typeof config.epsilon === 'number' ? config.epsilon : 0.25; // Exploration rate
    this.epsilonDecay = typeof config.epsilonDecay === 'number' ? config.epsilonDecay : 0.996;
    this.minEpsilon = typeof config.minEpsilon === 'number' ? config.minEpsilon : 0.02;

    // Q-Table: Map of stateKey -> { [action]: score }
    this.qTable = new Map();
    this.totalSteps = 0;
    this.totalRewards = 0;
  }

  /**
   * Discretizes continuous physics & market telemetry into composite string state key:
   * State = NetPower | Storage | MarketPrice | DeferrableLoad
   * e.g. "SURPLUS|MED_BATT|MID|TASK_PENDING"
   */
  discretizeState({ netPowerKW, batteryKWh, maxBatteryKWh, hasBattery, spotPrice, deferrableLoadKWh }) {
    // 1. Net Power
    let netCategory = 'BALANCED';
    if (netPowerKW > 0.5) netCategory = 'SURPLUS';
    else if (netPowerKW < -0.5) netCategory = 'DEFICIT';

    // 2. Storage
    let storageCategory = 'NO_BATTERY';
    if (hasBattery && maxBatteryKWh > 0) {
      const soc = (batteryKWh / maxBatteryKWh) * 100;
      if (soc < 25) storageCategory = 'LOW_BATT';
      else if (soc > 75) storageCategory = 'HIGH_BATT';
      else storageCategory = 'MED_BATT';
    }

    // 3. Market Price
    let priceCategory = 'MID';
    if (spotPrice < 0.10) priceCategory = 'LOW';
    else if (spotPrice > 0.22) priceCategory = 'HIGH';

    // 4. Deferrable Load
    const deferrableCategory = (deferrableLoadKWh && deferrableLoadKWh > 0.5) ? 'TASK_PENDING' : 'TASK_DONE';

    return `${netCategory}|${storageCategory}|${priceCategory}|${deferrableCategory}`;
  }

  /**
   * Returns valid action space based on agent hardware configuration
   */
  getValidActions({ hasBattery, isSurplus, deferrableLoadKWh }) {
    if (hasBattery) {
      return ['HOLD', 'CHARGE_OPPORTUNISTIC', 'DISCHARGE_MAX_PROFIT'];
    } else {
      // Battery-less node / Demand-response node
      const actions = ['MARKET_TAKER', 'CURTAIL_SOLAR'];
      if (deferrableLoadKWh > 0) {
        actions.push('SHIFT_LOAD_ON');
      }
      actions.push('SHIFT_LOAD_OFF');
      return actions;
    }
  }

  /**
   * Initialize state in Q-Table if not yet visited
   */
  getQRow(stateKey, validActions) {
    if (!this.qTable.has(stateKey)) {
      const row = {};
      validActions.forEach(action => {
        // Small initial optimistic bias for green trading
        row[action] = action === 'HOLD' || action === 'MARKET_TAKER' ? 0.05 : 0.0;
      });
      this.qTable.set(stateKey, row);
    }
    return this.qTable.get(stateKey);
  }

  /**
   * Epsilon-greedy action selection
   */
  selectAction(stateKey, validActions) {
    const row = this.getQRow(stateKey, validActions);

    // Exploration: choose random valid action
    if (Math.random() < this.epsilon) {
      const randomIndex = Math.floor(Math.random() * validActions.length);
      return {
        action: validActions[randomIndex],
        isExploration: true,
        epsilon: this.epsilon
      };
    }

    // Exploitation: choose action with maximum Q-value
    let bestAction = validActions[0];
    let maxQ = -Infinity;

    validActions.forEach(action => {
      const qVal = row[action] !== undefined ? row[action] : 0;
      if (qVal > maxQ) {
        maxQ = qVal;
        bestAction = action;
      }
    });

    return {
      action: bestAction,
      isExploration: false,
      epsilon: this.epsilon
    };
  }

  /**
   * Returns formatted Q-values array for UI breakdown
   */
  getQValues(stateKey, validActions) {
    const row = this.getQRow(stateKey, validActions);
    return validActions.map(action => ({
      action,
      qValue: Number((row[action] || 0).toFixed(3))
    })).sort((a, b) => b.qValue - a.qValue);
  }

  /**
   * Bellman equation update:
   * Q(s, a) <- Q(s, a) + alpha * [R + gamma * max_a' Q(s', a') - Q(s, a)]
   */
  learn(stateKey, action, reward, nextStateKey, nextValidActions) {
    this.totalSteps++;
    this.totalRewards += reward;

    const currentQRow = this.getQRow(stateKey, [action]);
    const currentQ = currentQRow[action] !== undefined ? currentQRow[action] : 0;

    // Estimate maximum future Q-value in next state
    const nextQRow = this.getQRow(nextStateKey, nextValidActions);
    let maxNextQ = 0;
    if (nextValidActions && nextValidActions.length > 0) {
      maxNextQ = Math.max(...nextValidActions.map(a => nextQRow[a] !== undefined ? nextQRow[a] : 0));
    }

    // Bellman Equation
    const tdTarget = reward + (this.gamma * maxNextQ);
    const tdError = tdTarget - currentQ;
    currentQRow[action] = Number((currentQ + this.alpha * tdError).toFixed(4));

    // Epsilon Decay
    if (this.epsilon > this.minEpsilon) {
      this.epsilon = Math.max(this.minEpsilon, Number((this.epsilon * this.epsilonDecay).toFixed(4)));
    }

    return {
      updatedQ: currentQRow[action],
      epsilon: this.epsilon,
      reward
    };
  }
}
