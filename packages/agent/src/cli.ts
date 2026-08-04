import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./config.js";
import { postCouponOnchain } from "./chain.js";
import { HarvestWorker } from "./worker.js";

const root = resolve(fileURLToPath(new URL("../../../", import.meta.url)));
config({ path: resolve(root, ".env") });
config();

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  const env = loadEnv();
  const worker = new HarvestWorker(env, resolve(root, "data") + "/");

  if (cmd === "harvest-once") {
    const record = await worker.runDemoHarvest({
      sourceId: args[0] ? Number(args[0]) : 2,
      amount: args[1] ? Number(args[1]) : 1000,
    });
    console.log(JSON.stringify(record, null, 2));
    return;
  }

  if (cmd === "post-coupon") {
    const sourceId = Number(args[0] ?? 2);
    const amount = BigInt(args[1] ?? "1000000000"); // 1000 pyUSD 6dec
    const desks: Record<number, string> = {
      1: "Trade Finance Invoice Pool",
      2: "T-Bill Proxy Desk",
      3: "Emerging Market Receivables",
    };
    const metadata = args[2] ?? `${desks[sourceId] ?? `Source ${sourceId}`} · CouponPaid`;
    const hash = await postCouponOnchain(env, sourceId, amount, metadata);
    console.log(hash);
    return;
  }

  console.log(`Usage:
  harvest-once [sourceId] [amount]
  post-coupon [sourceId] [amountRaw] [metadata]`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
