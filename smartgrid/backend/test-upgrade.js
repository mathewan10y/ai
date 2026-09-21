import assert from 'assert';
import { SimulationClock, GRID_CYCLES } from '../backend/services/SimulationClock.js';
import { QLearningBrain } from '../backend/agents/QLearningBrain.js';
import { GridPhysicsEngine } from '../backend/engine/GridPhysics.js';

console.log('--- RUNNING MARL DIGITAL TWIN UPGRADE VERIFICATION SUITE ---');

// 1. Verify SimulationClock
console.log('Test 1: SimulationClock 24-hour cycle & GridCycle classification');
const clock = new SimulationClock();

clock.setTime(7, 30);
assert.strictEqual(clock.getGridCycle(), GRID_CYCLES.MORNING_RAMP, '07:30 should be MORNING_RAMP');

clock.setTime(12, 15);
assert.strictEqual(clock.getGridCycle(), GRID_CYCLES.SOLAR_GLUT, '12:15 should be SOLAR_GLUT');

clock.setTime(17, 45);
assert.strictEqual(clock.getGridCycle(), GRID_CYCLES.EVENING_PEAK, '17:45 should be EVENING_PEAK');

clock.setTime(23, 0);
assert.strictEqual(clock.getGridCycle(), GRID_CYCLES.OFF_PEAK_NIGHT, '23:00 should be OFF_PEAK_NIGHT');

clock.setTime(3, 30);
assert.strictEqual(clock.getGridCycle(), GRID_CYCLES.OFF_PEAK_NIGHT, '03:30 should be OFF_PEAK_NIGHT');
console.log('✓ SimulationClock correctly classifies all 4 macro-demand regimes.');

// 2. Verify QLearningBrain 6D State Discretization
console.log('Test 2: Q-Learning 6D State Discretization');
const brain = new QLearningBrain();
const stateKey = brain.discretizeState({
  netPowerKW: 5.2,
  batteryKWh: 40.0,
  maxBatteryKWh: 50.0,
  hasBattery: true,
  spotPrice: 0.16,
  deferrableLoadKWh: 0.0,
  solarForecast: 'FORECAST_CLEAR',
  gridCycle: GRID_CYCLES.SOLAR_GLUT
});

assert.strictEqual(stateKey, 'SURPLUS|HIGH_BATT|MID|TASK_DONE|FORECAST_CLEAR|SOLAR_GLUT');
console.log('✓ QLearningBrain generates correct 6D state key:', stateKey);

// 3. Verify GridPhysics Thermal Congestion and Economic Curtailment
console.log('Test 3: GridPhysics Thermal Capacity Curtailment (100 kW Limit)');
const physics = new GridPhysicsEngine({ thermalLimitKW: 100 });

const candidateMatches = [
  {
    volume: 40,
    bid: { orderData: { priceLimit: 0.28 } },
    ask: { orderData: { priceLimit: 0.12 } },
    buyerId: 'b1', sellerId: 's1'
  },
  {
    volume: 50,
    bid: { orderData: { priceLimit: 0.24 } },
    ask: { orderData: { priceLimit: 0.14 } },
    buyerId: 'b2', sellerId: 's2'
  },
  {
    volume: 35, // This should trigger curtailment as 40 + 50 + 35 = 125 > 100
    bid: { orderData: { priceLimit: 0.19 } },
    ask: { orderData: { priceLimit: 0.15 } },
    buyerId: 'b3', sellerId: 's3'
  }
];

const result = physics.evaluateThermalCongestion(candidateMatches);
assert.strictEqual(result.clearedMatches.length, 3, 'Should have 3 cleared items (2 full, 1 partial)');
assert.strictEqual(result.curtailedMatches.length, 1, 'Should have 1 curtailed item');
assert.strictEqual(result.totalThroughputKW, 100, 'Total throughput must not exceed 100 kW thermal limit');
assert.strictEqual(result.isCongested, true, 'isCongested flag must be set');
console.log('✓ GridPhysics safely curtailed excess volume, keeping throughput strictly at', result.totalThroughputKW, 'kW.');

console.log('\n========================================');
console.log('🎉 ALL MARL DIGITAL TWIN TESTS PASSED!');
console.log('========================================\n');
