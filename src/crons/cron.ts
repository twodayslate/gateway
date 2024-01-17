import { Bindings } from "../bindings";
import { ExecutionContext } from "hono/dist/types/context";
import delete_old_data_cron from "./delete_old_data_cron";

async function cron(event: ScheduledEvent, env: Bindings, context: ExecutionContext) {
  switch (event.cron) {
    case env.DELETE_OLD_DATA_CRON:
      await delete_old_data_cron(env);
      break;
    default:
      context.passThroughOnException();
      console.warn(`Unknown cron job: ${event.cron}`);
  }
}

export default cron;
