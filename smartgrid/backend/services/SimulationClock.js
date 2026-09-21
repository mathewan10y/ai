import { eventBroker } from '../engine/eventBroker.js';

export const GRID_CYCLES = {
  MORNING_RAMP: 'MORNING_RAMP',     // 06:00 - 10:00: Rising demand, rising solar
  SOLAR_GLUT: 'SOLAR_GLUT',         // 10:00 - 15:00: Low net demand, peak solar generation
  EVENING_PEAK: 'EVENING_PEAK',     // 15:00 - 21:00: Maximum demand, plunging solar
  OFF_PEAK_NIGHT: 'OFF_PEAK_NIGHT'  // 21:00 - 06:00: Minimum demand, zero solar
};

export class SimulationClock {
  constructor(config = {}) {
    this.day = config.startDay || 1;
    this.hour = config.startHour !== undefined ? config.startHour : 8; // Default 08:00
    this.minute = config.startMinute !== undefined ? config.startMinute : 0;
    
    // Time scaling: 1 real second = 1 simulated minute (60s real = 1h simulated -> 24 min real = 1 full 24h day)
    this.timeScale = config.timeScale || 1.0;
    this.tickIntervalMs = config.tickIntervalMs || 1000; // Clock ticks every 1 second
    
    this.isPaused = false;
    this.timerId = null;

    this.setupListeners();
  }

  setupListeners() {
    eventBroker.on('grid:pause', (isPaused) => {
      this.isPaused = isPaused;
    });
  }

  start() {
    if (this.timerId) return;
    this.timerId = setInterval(() => {
      if (!this.isPaused) {
        this.advanceMinutes(1);
      }
    }, this.tickIntervalMs);
  }

  stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  advanceMinutes(mins = 1) {
    this.minute += mins;
    while (this.minute >= 60) {
      this.minute -= 60;
      this.hour += 1;
      if (this.hour >= 24) {
        this.hour = 0;
        this.day += 1;
      }
    }

    const state = this.getClockState();
    eventBroker.emit('clock:tick', state);
    return state;
  }

  getGridCycle() {
    const totalMinutes = this.hour * 60 + this.minute;
    
    // 06:00 (360 min) to 10:00 (600 min)
    if (totalMinutes >= 360 && totalMinutes < 600) {
      return GRID_CYCLES.MORNING_RAMP;
    }
    // 10:00 (600 min) to 15:00 (900 min)
    if (totalMinutes >= 600 && totalMinutes < 900) {
      return GRID_CYCLES.SOLAR_GLUT;
    }
    // 15:00 (900 min) to 21:00 (1260 min)
    if (totalMinutes >= 900 && totalMinutes < 1260) {
      return GRID_CYCLES.EVENING_PEAK;
    }
    // 21:00 to 06:00
    return GRID_CYCLES.OFF_PEAK_NIGHT;
  }

  getCycleDisplayName(cycle = this.getGridCycle()) {
    switch (cycle) {
      case GRID_CYCLES.MORNING_RAMP:
        return 'Morning Ramp';
      case GRID_CYCLES.SOLAR_GLUT:
        return 'Solar Glut';
      case GRID_CYCLES.EVENING_PEAK:
        return 'Evening Peak';
      case GRID_CYCLES.OFF_PEAK_NIGHT:
      default:
        return 'Off-Peak Night';
    }
  }

  getSolarMultiplier() {
    const cycle = this.getGridCycle();
    const totalMinutes = this.hour * 60 + this.minute;
    switch (cycle) {
      case GRID_CYCLES.MORNING_RAMP: {
        // Ramp up from 0.1 to 0.85
        const progress = (totalMinutes - 360) / 240;
        return 0.15 + progress * 0.70;
      }
      case GRID_CYCLES.SOLAR_GLUT: {
        // Peak solar 0.85 to 1.35 (bell curve peaking at 12:30)
        const peakProgress = Math.sin(((totalMinutes - 600) / 300) * Math.PI);
        return 0.85 + peakProgress * 0.50;
      }
      case GRID_CYCLES.EVENING_PEAK: {
        // Rapid drop from 0.85 to 0.0
        const dropProgress = 1 - ((totalMinutes - 900) / 360);
        return Math.max(0, dropProgress * 0.75);
      }
      case GRID_CYCLES.OFF_PEAK_NIGHT:
      default:
        return 0.0;
    }
  }

  getDemandMultiplier() {
    const cycle = this.getGridCycle();
    const totalMinutes = this.hour * 60 + this.minute;
    switch (cycle) {
      case GRID_CYCLES.MORNING_RAMP: {
        const progress = (totalMinutes - 360) / 240;
        return 0.8 + progress * 0.4; // 0.8 -> 1.2
      }
      case GRID_CYCLES.SOLAR_GLUT: {
        return 0.9; // Baseline daytime demand
      }
      case GRID_CYCLES.EVENING_PEAK: {
        const peakProgress = Math.sin(((totalMinutes - 900) / 360) * Math.PI);
        return 1.3 + peakProgress * 0.6; // Peak up to 1.9
      }
      case GRID_CYCLES.OFF_PEAK_NIGHT:
      default:
        return 0.55; // Low night baseline
    }
  }

  getFormattedTime() {
    const hh = String(this.hour).padStart(2, '0');
    const mm = String(this.minute).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  getClockState() {
    const gridCycle = this.getGridCycle();
    const timeFormatted = this.getFormattedTime();
    return {
      day: this.day,
      hour: this.hour,
      minute: this.minute,
      timeString: `Day ${this.day} - ${timeFormatted}`,
      timeFormatted,
      gridCycle,
      cycleDisplayName: this.getCycleDisplayName(gridCycle),
      solarMultiplier: Number(this.getSolarMultiplier().toFixed(3)),
      demandMultiplier: Number(this.getDemandMultiplier().toFixed(3)),
      isPaused: this.isPaused
    };
  }

  setTime(hour, minute = 0, day = this.day) {
    this.hour = Math.max(0, Math.min(23, hour));
    this.minute = Math.max(0, Math.min(59, minute));
    this.day = Math.max(1, day);
    const state = this.getClockState();
    eventBroker.emit('clock:tick', state);
    return state;
  }
}

export const simulationClock = new SimulationClock();
