import {ZeppBundle} from "./src/ZeppBundle.js";
import enquirer from "enquirer";
import {ZabMakeDeletable} from "./src/ZabMakeDeletable.js";
import path from "node:path";
import {SelfHostFolderGenerate} from "./src/SelfHostFolderGenerate.js";
import {SelfHostQrGenerate} from "./src/SelfHostQrGenerate.js";
import {getAllKnownDeviceNames} from "./src/ZeppDevices.js";
import storage from "./src/storage.js";

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

export async function processProject(projectPath, userChoose) {
    const { actions, baseURL } = userChoose;
    const zabPath = path.resolve(projectPath);
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
    console.log("")
    if(bundle.appType === "app") {
        const allDevices = await getAllKnownDeviceNames();
        const unsupported = [];
        for(const dev of allDevices)
            if(!mapJson["device_qr"][dev])
                unsupported.push(dev);

        console.log("ZeppOS devices compatibility coverage:", (100 - (unsupported.length / allDevices.length * 100)).toFixed(2) + "%");
        if(unsupported.length > 0)
            console.log("Unsupported by your app:", unsupported.join(", "))
    } else {
        console.log("Ready for devices:", Object.keys(mapJson["device_qr"]).join(", "));
    }
}
