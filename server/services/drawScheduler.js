import cron from "node-cron";
import drawController from "../controllers/drawController.js";

let drawSchedulerTask = null;

function startDrawScheduler() {
  const schedulerEnabled = String(process.env.ENABLE_MONTHLY_DRAW_SCHEDULER || "false").toLowerCase() === "true";

  if (!schedulerEnabled) {
    return null;
  }

  // Runs at 00:05 on the 1st day of every month.
  drawSchedulerTask = cron.schedule("5 0 1 * *", async () => {
    try {
      await drawController.publishMonthlyDrawJob({ mode: "algorithmic-most" });
      console.log("Monthly draw scheduler: draw published successfully");
    } catch (error) {
      console.error(`Monthly draw scheduler failed: ${error.message}`);
    }
  });

  return drawSchedulerTask;
}

export default {
  startDrawScheduler,
};
