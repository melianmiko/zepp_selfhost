#!/usr/bin/env node
import {processProject, promptUserChoose} from "./index.js";
import { existsSync } from 'fs';
import path from "node:path";
import chalk from "chalk";

if(!process.argv[2]) {
    console.error("Usage: zepp_selfhost [filename]")
    process.exit(1);
}

const zabPath = path.resolve(process.argv[2]);

if(!existsSync(zabPath)) {
    console.error(chalk.red(`Provided file not found: ${zabPath}`))
    process.exit(1);
}

await processProject(zabPath, await promptUserChoose());
