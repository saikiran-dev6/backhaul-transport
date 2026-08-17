import { createRequire } from "node:module";
import path from "node:path";

const requireFromApi = createRequire(import.meta.url);
const cwd = process.cwd();
const projectRoot = cwd.endsWith(path.join("apps", "api")) ? path.resolve(cwd, "..", "..") : cwd;
const { PrismaClient } = requireFromApi(path.join(projectRoot, "node_modules", "@prisma", "client"));

export const prisma = new PrismaClient();
