import path from "node:path";
import fs from "node:fs";
import QRCode from 'qrcode';

export class SelfHostQrGenerate {
    static async apply(bundle, mapData) {
        return await new SelfHostQrGenerate(bundle).apply(mapData);
    }

    /**
     * @param {ZeppBundle} bundle
     */
    constructor(bundle) {
        this.bundle = bundle;
    }

    async apply(mapData) {
        // Prepare serve directory
        const homeDir = path.dirname(this.bundle.fileLocation);
        const serveDir = `${homeDir}/serve/${this.bundle.appId}/QR`;

        if(fs.existsSync(serveDir))
            await fs.promises.rm(serveDir, {recursive: true});
        await fs.promises.mkdir(serveDir, {recursive: true});

        // Make files
        for(const [deviceName, qrURL] of Object.entries(mapData["device_qr"])) {
            const path = `${serveDir}/${deviceName}.png`;
            await QRCode.toFile(path, qrURL, {scale: 8});
        }
    }
}
