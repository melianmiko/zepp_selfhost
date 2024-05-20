#!/usr/bin/env node
import {processProject, promptUserChoose} from "./index.js";

if(!process.argv[2]) {
    console.error("Usage: zepp_selfhost [filename]")
    process.exit(1);
}

await processProject(process.argv[2], await promptUserChoose());
