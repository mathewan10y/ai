/**
 * GridPhysics Engine
 * Models physical grid distribution constraints, transformer thermal capacities,
 * and dynamic economic-margin-based trade curtailment under network congestion.
 */
export class GridPhysicsEngine {
  constructor(config = {}) {
    // Transformer thermal throughput limit in kW
    this.thermalLimitKW = config.thermalLimitKW || 100.0;
    this.currentThroughputKW = 0.0;
    this.isCongested = false;
    this.curtailedTradesCount = 0;
    this.totalCurtailedVolumeKwh = 0.0;
  }

  /**
   * Evaluates pending candidate matches against the physical transformer thermal capacity limit.
   * If total flow exceeds thermalLimitKW, trades are prioritized by economic surplus
   * (bidPrice - askPrice) and excess volume is dynamically curtailed.
   * 
   * @param {Array} candidateMatches - Array of { bid, ask, volume, uniformPrice, surplusMargin }
   * @returns {Object} { clearedMatches, curtailedMatches, totalThroughputKW, isCongested }
   */
  evaluateThermalCongestion(candidateMatches) {
    if (!candidateMatches || candidateMatches.length === 0) {
      this.currentThroughputKW = 0.0;
      this.isCongested = false;
      return {
        clearedMatches: [],
        curtailedMatches: [],
        totalThroughputKW: 0.0,
        isCongested: false
      };
    }

    // Sort candidate matches by highest economic surplus margin first
    const sortedCandidates = [...candidateMatches].sort((a, b) => {
      const marginA = (a.bid?.orderData?.priceLimit || 0) - (a.ask?.orderData?.priceLimit || 0);
      const marginB = (b.bid?.orderData?.priceLimit || 0) - (b.ask?.orderData?.priceLimit || 0);
      return marginB - marginA;
    });

    let cumulativeFlowKW = 0.0;
    const clearedMatches = [];
    const curtailedMatches = [];

    for (const match of sortedCandidates) {
      const neededVolume = match.volume;

      if (cumulativeFlowKW + neededVolume <= this.thermalLimitKW) {
        // Fully within thermal headroom
        clearedMatches.push(match);
        cumulativeFlowKW += neededVolume;
      } else if (cumulativeFlowKW < this.thermalLimitKW) {
        // Partial capacity remaining: scale down to fit transformer limit
        const availableHeadroom = Number((this.thermalLimitKW - cumulativeFlowKW).toFixed(2));
        if (availableHeadroom > 0.2) {
          const curtailedPortion = Number((neededVolume - availableHeadroom).toFixed(2));
          clearedMatches.push({
            ...match,
            volume: availableHeadroom,
            originalVolume: neededVolume,
            isPartiallyCurtailed: true
          });
          curtailedMatches.push({
            ...match,
            curtailedVolume: curtailedPortion,
            reason: 'TRANSFORMER_THERMAL_CONGESTION_PARTIAL'
          });
          cumulativeFlowKW += availableHeadroom;
          this.totalCurtailedVolumeKwh = Number((this.totalCurtailedVolumeKwh + curtailedPortion).toFixed(2));
        } else {
          curtailedMatches.push({
            ...match,
            curtailedVolume: neededVolume,
            reason: 'TRANSFORMER_THERMAL_CONGESTION'
          });
          this.totalCurtailedVolumeKwh = Number((this.totalCurtailedVolumeKwh + neededVolume).toFixed(2));
        }
      } else {
        // Completely over thermal limit: fully curtailed
        curtailedMatches.push({
          ...match,
          curtailedVolume: neededVolume,
          reason: 'TRANSFORMER_THERMAL_CONGESTION'
        });
        this.totalCurtailedVolumeKwh = Number((this.totalCurtailedVolumeKwh + neededVolume).toFixed(2));
      }
    }

    this.currentThroughputKW = Number(cumulativeFlowKW.toFixed(2));
    this.isCongested = curtailedMatches.length > 0 || cumulativeFlowKW >= (this.thermalLimitKW * 0.95);
    this.curtailedTradesCount += curtailedMatches.length;

    return {
      clearedMatches,
      curtailedMatches,
      totalThroughputKW: this.currentThroughputKW,
      thermalLimitKW: this.thermalLimitKW,
      congestionRatio: Number(((this.currentThroughputKW / this.thermalLimitKW) * 100).toFixed(1)),
      isCongested: this.isCongested
    };
  }

  getPhysicsState() {
    return {
      transformerLoadKW: this.currentThroughputKW,
      thermalLimitKW: this.thermalLimitKW,
      congestionRatio: Number(((this.currentThroughputKW / this.thermalLimitKW) * 100).toFixed(1)),
      isCongested: this.isCongested,
      curtailedTradesCount: this.curtailedTradesCount,
      totalCurtailedVolumeKwh: this.totalCurtailedVolumeKwh
    };
  }
}

export const gridPhysics = new GridPhysicsEngine();
