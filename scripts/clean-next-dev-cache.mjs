import { rm } from "node:fs/promises";
import { join } from "node:path";

const target = join(process.cwd(), ".next");

try {
  await rm(target, { recursive: true, force: true });
  console.log(`[clean-next-dev-cache] Removed generated Next cache: ${target}`);
} catch (error) {
  console.warn(`[clean-next-dev-cache] Could not remove ${target}:`, error?.message || error);
}
