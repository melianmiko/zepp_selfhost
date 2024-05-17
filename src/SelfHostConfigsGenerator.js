import {getDevicesByParams, getPlatformToDeviceMap} from "./ZeppDevices.js";

const platformToDevice = await getPlatformToDeviceMap();

export class SelfHostConfigsGenerator {
    static apply(bundle, baseURL = "https://example.com") {
        return new SelfHostConfigsGenerator(bundle).generate(baseURL);
    }

    /**
     * @param {ZeppBundle} bundle
     */
    constructor(bundle) {
        this.bundle = bundle;
    }

    async parsePlatform(input) {
        const devices = [];
        const sources = [];

        for(const row of input) {
            if(row.deviceSource) {
                // Easy mode
                const device = platformToDevice.get(row.deviceSource);
                if (!device) {
                    console.warn(`Unknown platformSource ${row.deviceSource}, skipping`);
                    continue;
                }

                sources.push(row.deviceSource);
                devices.push(device.deviceName);
            } else if(row.screenType && row.screenResolution && row.cpuPlatform) {
                // Generic model
                const [w, h] = row.screenResolution.split("x").map((r) => parseInt(r));
                const devs = await getDevicesByParams(row.screenType, w, h, row.cpuPlatform.toLowerCase());
                devices.push(...devs.map((row) => row.deviceName));
                for(const row of devs)
                    sources.push(...row.deviceSource);
            } else {
                console.warn("Skip unsupported platform declaration schema", row);
            }
        }

        return [devices, sources];
    }

    async generate(baseUrl) {
        const sourceUrl = {};
        const deviceQr = {};
        const files = {};

        const qrUrlTemplate = this.bundle.appType === "app" ?
            `${baseUrl.replace("https:", "zpkd1:")}/${this.bundle.appId}/%basename%.zpk` :
            `${baseUrl.replace("https:", "watchface:")}/${this.bundle.appId}/%basename%.json`;

        for(const row of this.bundle.manifest.zpks) {
            const [devices, sources] = await this.parsePlatform(row.platforms);

            const basename = row.name.replace(".zpk", "");
            const downloadUrl = `${baseUrl}/${this.bundle.appId}/${row.name}`;
            const qrUrl = qrUrlTemplate.replace("%basename%", basename);

            if(this.bundle.appType === "watchface") {
                files[`${basename}.json`] = {
                    "appid": this.bundle.appId,
                    "name": this.bundle.appName,
                    "updated_at": Date.now(),
                    "url": downloadUrl,
                    "preview": "https://mmk.pw/static/favicon/mmk.pw/favicon-120x120.png",
                    "devices": sources,
                }
            }

            for(const pl of sources) {
                if(sourceUrl[pl])
                    console.warn(`Multiple bundles with same deviceSource ${pl}`);
                sourceUrl[pl] = downloadUrl
            }

            for(const device of devices) {
                if(deviceQr[devices])
                    console.warn(`Multiple bundles with same deviceName ${device}`);
                deviceQr[device] = qrUrl;
            }
        }

        files["map.json"] = {
            "device_qr": deviceQr,
            "source_redirect": sourceUrl,
        }

        return files;
    }
}