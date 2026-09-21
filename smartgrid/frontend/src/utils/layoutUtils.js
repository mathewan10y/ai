export const DEFAULT_BUSBAR_POSITION = { x: 50, y: 300 };
export const DEFAULT_BUSBAR_WIDTH = 1200;

/**
 * Auto-layout utility function: distributeNodesOnBus
 * Evenly spaces all non-bus agent nodes along the X-axis of the busbar.
 * Places half the nodes exactly 250px above the bus (Y = busbarY - 250),
 * and half exactly 250px below the bus (Y = busbarY + 250), ensuring generous padding.
 */
export function distributeNodesOnBus(
  agentNodes,
  busbarPos = DEFAULT_BUSBAR_POSITION,
  busbarWidth = DEFAULT_BUSBAR_WIDTH
) {
  const gridNode = agentNodes.find(
    (n) => n.id === 'grid-main' || n.category === 'UtilityGrid' || n.type === 'GridNode'
  );
  const otherNodes = agentNodes.filter((n) => n.id !== (gridNode?.id || 'grid-main'));

  const halfCount = Math.ceil(otherNodes.length / 2);
  const topNodes = otherNodes.slice(0, halfCount);
  const bottomNodes = otherNodes.slice(halfCount);

  const updatedPositions = new Map();

  // Top row: exactly 250px above the busbar
  const topSpacing = busbarWidth / (topNodes.length + 1);
  topNodes.forEach((node, idx) => {
    const x = busbarPos.x + topSpacing * (idx + 1) - 128; // Center 256px node on slot
    const y = busbarPos.y - 250;
    updatedPositions.set(node.id, { x, y });
  });

  // Bottom row: exactly 250px below the busbar
  const bottomSpacing = busbarWidth / (bottomNodes.length + 1);
  bottomNodes.forEach((node, idx) => {
    const x = busbarPos.x + bottomSpacing * (idx + 1) - 128; // Center 256px node on slot
    const y = busbarPos.y + 250;
    updatedPositions.set(node.id, { x, y });
  });

  // Utility grid node placed at the far right of the busbar
  if (gridNode) {
    updatedPositions.set(gridNode.id, {
      x: busbarPos.x + busbarWidth + 40,
      y: busbarPos.y - 95
    });
  }

  return updatedPositions;
}
