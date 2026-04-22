/**
 * Compute field status based on stage and planting date.
 *
 * Logic:
 * - Completed  : stage = 'Harvested'
 * - At Risk    : stage = 'Growing' AND more than 120 days since planting
 *                OR stage = 'Planted' AND more than 30 days since planting (not progressing)
 * - Active     : all other cases
 */
function computeStatus(stage, plantingDate) {
  if (stage === 'Harvested') return 'Completed';

  const daysSincePlanting = Math.floor(
    (Date.now() - new Date(plantingDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (stage === 'Growing' && daysSincePlanting > 120) return 'At Risk';
  if (stage === 'Planted' && daysSincePlanting > 30) return 'At Risk';

  return 'Active';
}

module.exports = { computeStatus };
