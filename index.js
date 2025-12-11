import {ZeppBundle} from "./src/ZeppBundle.js";
import enquirer from "enquirer";
import {ZabMakeDeletable} from "./src/ZabMakeDeletable.js";
import path from "node:path";
import {SelfHostFolderGenerate} from "./src/SelfHostFolderGenerate.js";
import {SelfHostQrGenerate} from "./src/SelfHostQrGenerate.js";
import {getAllKnownDeviceNames} from "./src/ZeppDevices.js";
import storage from "./src/storage.js";
import chalk from "chalk";

export async function promptUserChoose() {
    const { actions, baseURL } = await enquirer.prompt([
        {
            type: "multiselect",
            name: "actions",
            message: "Did you need some extras?",
            choices: [
                {message: "Patch to make app uninstallable", name: "patch_deletable"},
                {message: "Generate QR-codes for each served ZPK file", name: "make_qr"},
                {message: "Create sub-folder with appId", name: "app_id_dir"},
            ],
            initial: await storage.getItem("lastActions") ?? [
                "patch_deletable",
                "make_qr",
                "app_id_dir"
            ]
        },
        {
            type: "input",
            name: "baseURL",
            message: "Enter serve base URL",
            initial: await storage.getItem("lastBaseUrl") ?? "",
        }
    ]);

    if(!baseURL.startsWith("https:")) {
        console.error("");
        console.error("Serve base URL should start with https://, pure HTTP won't work with Zepp application.");
        console.error("Please, provide foll base URL, example: https://example.com/folder");
        process.exit(1);
    }

    await storage.setItem("lastActions", actions);
    await storage.setItem("lastBaseUrl", baseURL);

    return {actions, baseURL};
}

export async function processProject(zabPath, userChoose) {
    const { actions, baseURL } = userChoose;
    const bundle = new ZeppBundle();
    bundle.loadBundle(zabPath);

    if(actions.includes("patch_deletable"))
        ZabMakeDeletable.apply(bundle)

    // QR codes
    const mapJson = await SelfHostFolderGenerate.apply(bundle, baseURL, actions.includes("app_id_dir"));
    if(actions.includes("make_qr")) {
        await SelfHostQrGenerate.apply(bundle, mapJson, actions.includes("app_id_dir"));
    }

    // Compatibility report
    console.log("");
    if(bundle.appType === "app") {
        const allDevices = await getAllKnownDeviceNames();
        const supported = Object.keys(mapJson["device_qr"]);
        const excluded = mapJson.ignored_devices;
        const mapped = [...supported, ...excluded];
        const unsupported = [];

        for(const dev of allDevices)
            if(!mapped.includes(dev))
                unsupported.push(dev);

        const percent = supported.length / allDevices.length * 100
        const color = percent > 60 ? chalk.green : chalk.yellow;

        console.log(
            chalk.bold("Compatibility coverage:"),
            color(`${percent.toFixed(2)}%`)
        );
        console.log('');

        console.log(
            chalk.bold("Supported:"),
            supported.map(it => chalk.greenBright(it)).join(", "),
        );

        if(excluded.length > 0) {
            console.log(
                chalk.bold("Excluded due to OS/API version:"),
                excluded.map(it => chalk.yellowBright(it)).join(", "),
            );
        }

        if(unsupported.length > 0) {
            console.log(
                chalk.bold("Not supported:"),
                unsupported.map(it => chalk.redBright(it)).join(", "),
            );
        }

        console.log('');
    } else {
        console.log("Ready for devices:", Object.keys(mapJson["device_qr"]).join(", "));
    }
}
