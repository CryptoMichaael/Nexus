/**
 * ✅ DAILY ROI CALCULATOR WORKER
 * Runs daily to calculate and credit ROI
 */

import { pool } from '../db/pool';
import { logger } from '../config/logger';
import { ROICalculatorService } from '../services/roiCalculator.service';

async function main() {
  logger.info('ROI Calculator Worker started');

  const roiService = new ROICalculatorService(pool);

  try {
    const result = await roiService.calculateDailyROI();

    logger.info({
      processedCount: result.processedCount,
      totalROICredited: result.totalROICredited
    }, 'ROI calculation completed successfully');

    process.exit(0);
  } catch (error: any) {
    logger.error({ err: error }, 'ROI calculation failed');
    process.exit(1);
  }
}

main();
