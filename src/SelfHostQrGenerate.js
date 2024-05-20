import path from "node:path";
import fs from "node:fs";
import QRCode from 'qrcode';

export class SelfHostQrGenerate {
    static async apply(bundle, mapData, withSubFolder) {
        return await new SelfHostQrGenerate(bundle).apply(mapData, withSubFolder);
    }

    /**
     * @param {ZeppBundle} bundle
     */
    constructor(bundle) {
        this.bundle = bundle;
    }

    async apply(mapData, withSubFolder) {
        // Prepare serve directory
        const rootDir = path.dirname(this.bundle.fileLocation) + "/serve";
        const baseServeDir = withSubFolder ? `${rootDir}/${this.bundle.appId}` : rootDir;
        const serveDir = `${baseServeDir}/QR`;

        await fs.promises.mkdir(serveDir, {recursive: true});

        // Make files
        for(const [deviceName, qrURL] of Object.entries(mapData["device_qr"])) {
            const path = `${serveDir}/${deviceName}.png`;
            await QRCode.toFile(path, qrURL, {scale: 8});
        }
    }
}
