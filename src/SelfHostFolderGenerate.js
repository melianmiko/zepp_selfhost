import path from "node:path";
import fs from "node:fs";
import {SelfHostConfigsGenerator} from "./SelfHostConfigsGenerator.js";

export class SelfHostFolderGenerate {
    static async apply(bundle, baseUrl, withSubFolder) {
        return await new SelfHostFolderGenerate(bundle).apply(baseUrl, withSubFolder);
    }

    /**
     * @param {ZeppBundle} bundle
     */
    constructor(bundle) {
        this.bundle = bundle;
    }

    async apply(baseUrl, withSubFolder) {
        // Prepare serve directory
        const rootDir = path.dirname(this.bundle.fileLocation) + "/serve";
        const serveDir = withSubFolder ? `${rootDir}/${this.bundle.appId}` : rootDir;

        if(fs.existsSync(rootDir))
            await fs.promises.rm(rootDir, {recursive: true});
        await fs.promises.mkdir(serveDir, {recursive: true});

        // Write all packages
        for(const [pkgName, pkgData] of Object.entries(this.bundle.packages)) {
            const pkgFile = this.bundle.buildPackage(pkgData, true);
            await fs.promises.writeFile(`${serveDir}/${pkgName}`, pkgFile);
        }

        // Write all maps
        const files = await SelfHostConfigsGenerator.apply(this.bundle, baseUrl, withSubFolder);
        for(const [fileName, fileData] of Object.entries(files)) {
            await fs.promises.writeFile(`${serveDir}/${fileName}`, Buffer.from(JSON.stringify(fileData)));
        }

        return files["map.json"];
    }
}
