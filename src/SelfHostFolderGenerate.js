import path from "node:path";
import fs from "node:fs";
import {SelfHostConfigsGenerator} from "./SelfHostConfigsGenerator.js";

export class SelfHostFolderGenerate {
    static async apply(bundle, baseUrl) {
        return await new SelfHostFolderGenerate(bundle).apply(baseUrl);
    }

    /**
     * @param {ZeppBundle} bundle
     */
    constructor(bundle) {
        this.bundle = bundle;
    }

    async apply(baseUrl) {
        // Prepare serve directory
        const homeDir = path.dirname(this.bundle.fileLocation);
        const serveDir = `${homeDir}/serve/${this.bundle.appId}`;

        if(fs.existsSync(serveDir))
            await fs.promises.rm(serveDir, {recursive: true});
        await fs.promises.mkdir(serveDir, {recursive: true});

        // Write all packages
        for(const [pkgName, pkgData] of Object.entries(this.bundle.packages)) {
            const pkgFile = this.bundle.buildPackage(pkgData, true);
            await fs.promises.writeFile(`${serveDir}/${pkgName}`, pkgFile);
        }

        // Write all maps
        const files = await SelfHostConfigsGenerator.apply(this.bundle, baseUrl);
        for(const [fileName, fileData] of Object.entries(files)) {
            await fs.promises.writeFile(`${serveDir}/${fileName}`, Buffer.from(JSON.stringify(fileData)));
        }

        return files["map.json"];
    }
}
