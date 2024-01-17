import { Bindings } from "../bindings";


async function delete_old_data_cron(env: Bindings) {
  const response = await env.DB.prepare(`
      DELETE
      FROM requests
      WHERE created_at < datetime('now', ?1)
  `)
    .bind(env.DELETE_OLD_DATA_BEFORE)
    .run();

  if (response.error) {
    throw `Delete old data cron failed: ${response.error}`;
  }

  console.info(`Delete old data cron completed successfully.\nMetadata: ${JSON.stringify(response.meta)}`);
  return response.meta;
}

export default delete_old_data_cron;
