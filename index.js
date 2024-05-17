#!/usr/bin/env node
import {ZeppBundle} from "./src/ZeppBundle.js";
import enquirer from "enquirer";
import {ZabMakeDeletable} from "./src/ZabMakeDeletable.js";
import path from "node:path";
import {SelfHostFolderGenerate} from "./src/SelfHostFolderGenerate.js";
import {SelfHostQrGenerate} from "./src/SelfHostQrGenerate.js";
import {getAllKnownDeviceNames} from "./src/ZeppDevices.js";
import storage from "./src/storage.js";

if(!process.argv[2]) {
    console.error("Usage: zepp_selfhost [filename]")
    process.exit(1);
}

const { actions, baseURL } = await enquirer.prompt([
    {
        type: "multiselect",
        name: "actions",
        message: "Did you need some extras?",
        choices: [
            {message: "Patch to make app uninstallable", name: "patch_deletable"},
            {message: "Generate QR-codes for each served ZPK file", name: "make_qr"},
        ],
        initial: [
            "patch_deletable",
            "make_qr"
        ]
    },
    {
        type: "input",
        name: "baseURL",
        message: "Enter serve base URL",
        initial: await storage.getItem("lastBaseUrl")
    }
]);

await storage.setItem("lastBaseUrl", baseURL);

const zabPath = path.resolve(process.argv[2])
const bundle = new ZeppBundle();
bundle.loadBundle(zabPath);

if(actions.includes("patch_deletable"))
    ZabMakeDeletable.apply(bundle)

// QR codes
const mapJson = await SelfHostFolderGenerate.apply(bundle, baseURL);
if(actions.includes("make_qr")) {
    SelfHostQrGenerate.apply(bundle, mapJson);
}

// Compatibility report
console.log("")
if(bundle.appType === "app") {
    const allDevices = await getAllKnownDeviceNames();
    const unsupported = [];
    for(const dev of allDevices)
        if(!mapJson["device_qr"][dev])
            unsupported.push(dev);

    console.log("ZeppOS devices compatibility coverage:", (100 - (unsupported.length / allDevices.length * 100)).toFixed(2) + "%");
    console.log("Unsupported by your app:", unsupported.join(", "))
} else {
    console.log("Ready for devices:", Object.keys(mapJson["device_qr"]).join(", "));
}












