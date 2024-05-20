import {getDevicesByParams, getPlatformToDeviceMap} from "./ZeppDevices.js";

const platformToDevice = await getPlatformToDeviceMap();

export class SelfHostConfigsGenerator {
    static apply(bundle, baseURL = "https://example.com", withSubFolder = true) {
        return new SelfHostConfigsGenerator(bundle).generate(baseURL, withSubFolder);
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

    async generate(baseUrl, withSubFolder) {
        const sourceUrl = {};
        const deviceQr = {};
        const files = {};

        const isApp = this.bundle.appType === "app"
        const transformedBaseUrl = baseUrl.replace("https:", isApp ? "zpkd1:" : "watchface:");
        const basePath = withSubFolder ? "/" + this.bundle.appId : "";
        const entryExtension = isApp ? "zpk" : "json";
        const qrUrlTemplate = `${transformedBaseUrl}${basePath}/%basename%.${entryExtension}`;

        for(const row of this.bundle.manifest.zpks) {
            const [devices, sources] = await this.parsePlatform(row.platforms);

            const basename = row.name.replace(".zpk", "");
            const downloadUrl = `${baseUrl}${basePath}/${row.name}`;
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
                if(sourceUrl[pl]) {
                    sourceUrl[pl].push(downloadUrl);
                } else {
                    sourceUrl[pl] = [downloadUrl]
                }
            }

            for(const device of devices) {
                if(deviceQr[device]) {
                    deviceQr[device].push(qrUrl);
                } else {
                    deviceQr[device] = [qrUrl];
                }
            }
        }

        // Tools
        const flatMap = (map) => Object.fromEntries(
            Object.entries(map).map(([k, v]) => [k, v[0]])
        );
        const formatConflicts = (arr) => arr.map(
            (url) => url.split("/").pop()
        );

        // Check for conflicts
        // for(const src in sourceUrl)
        //     if(sourceUrl[src].length > 1)
        //         console.warn(`More than one target pretend to deviceSource=${src}`,
        //             formatConflicts(sourceUrl[src]))
        // for(const dev in deviceQr)
        //     if(deviceQr[dev].length > 1)
        //         console.warn(`More than one target pretend to deviceName=${dev}`,
        //             formatConflicts(deviceQr[dev]))

        files["map.json"] = {
            "device_qr": flatMap(deviceQr),
            "source_redirect": flatMap(sourceUrl),
        }

        return files;
    }
}