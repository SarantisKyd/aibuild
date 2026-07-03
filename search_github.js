const { searchIntegrations } = require('./integrations'); // Generic path, I hope it's available
async function run() {
  try {
    const results = await searchIntegrations("GitHub");
    console.log(JSON.stringify(results, null, 2));
  } catch (e) {
    console.log("Error:", e.message);
  }
}
run();
