import { EventEmitter } from 'events';

// Create a singleton central event broker for internal pub/sub communication
class GridEventBroker extends EventEmitter {
  constructor() {
    super();
    // Allow ample listeners for multi-agent network
    this.setMaxListeners(100);
  }
}

export const eventBroker = new GridEventBroker();
