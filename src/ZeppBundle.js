import Zip from "adm-zip";
import {createHash} from "node:crypto";

export class ZeppBundle {
    constructor() {
        this.manifest = {
            zpks: []
        };
        this.fileLocation = "";
        this.packages = {};
        this.packagesDeviceManifests = {};
        this._cacheAppId = null;
        this._cachedAppName = null;
    }

    get appType() {
        return this.manifest.zpks[0].appType;
    }

    get appId() {
        if(!this._cacheAppId) {
            const randomPkg = Object.values(this.packages)[0];
            const randomFiles = Object.values(randomPkg)[0];
            const randomAppJson = JSON.parse(randomFiles["app.json"].toString("utf8"));
            this._cacheAppId = randomAppJson.app.appId;
        }

        return this._cacheAppId;
    }

    get appName() {
        if(!this._cachedAppName) {
            const randomPkg = Object.values(this.packages)[0];
            const randomFiles = Object.values(randomPkg)[0];
            const randomAppJson = JSON.parse(randomFiles["app.json"].toString("utf8"));
            this._cachedAppName = randomAppJson.app.appName;
        }

        return this._cachedAppName;
    }

    loadBundle(zabFilePath) {
        const bundle = new Zip(zabFilePath, {});
        for(const file of bundle.getEntries("")) {
            if(file.entryName.endsWith(".zpk"))
                this.parsePackage(file);
            else if(file.entryName === "manifest.json")
                this.manifest = JSON.parse(file.getData().toString("utf8"));
        }
        this.fileLocation = zabFilePath;
    }

    parsePackage(packageFile) {
        const pkg = new Zip(packageFile.getData(), {});
        const pkgData = {};
        for(const zipItem of pkg.getEntries("")) {
            if(!zipItem.entryName.endsWith(".zip")) {
                console.warn(`Unknown member of BUNDLE/${packageFile.entryName}/${zipItem.entryName}, skipping...`);
                continue;
            }

            const files = {};
            const innerZip = new Zip(zipItem.getData(), {});
            for(const file of innerZip.getEntries("")) {
                files[file.entryName] = file.getData();
            }
            pkgData[zipItem.entryName] = files;
        }

        // Try to load device manifest file
        const deviceManifest = pkgData['device.zip']['app.json'];

        if(deviceManifest) {
            this.packagesDeviceManifests[packageFile.entryName] = JSON.parse(deviceManifest.toString("utf-8"))
        }

        this.packages[packageFile.entryName] = pkgData;
    }

    buildPackage(pkgData) {
        const pkg = new Zip();

        if(this.appType === "watchface") {
            const files = pkgData["device.zip"];
            for(const filename in files) {
                pkg.addFile(filename, files[filename]);
            }
            return pkg.toBuffer();
        }

        for(const zipItemName in pkgData) {
            const innerZip = new Zip();
            for(const filename in pkgData[zipItemName]) {
                innerZip.addFile(filename, pkgData[zipItemName][filename]);
            }
            pkg.addFile(zipItemName, innerZip.toBuffer());
        }

        return pkg.toBuffer();
    }
}