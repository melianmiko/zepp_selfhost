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

    isVersionGreaterOrEqual(v1, v2) {
        const [v1p, v2p] = [v1, v2].map(
            v => v.split(".").map(c => parseInt(c))
        );

        let i = 0;
        for(; i < v1p.length || i < v2p.length; i++) {
            if((v1p[i] ?? 0) > (v2p[i] ?? 0)) {
                return true;
            } else if((v1p[i] ?? 0) < (v2p[i] ?? 0)) {
                return false;
            }
        }

        return (v1p[i - 1] ?? 0) === (v2p[i - 1] ?? 0);
    }

    async parsePlatform(input, deviceManifest) {
        const devices = [];
        const sources = [];
        const ignoredDevices = [];

        const runtimeMinVersion = deviceManifest?.runtime?.apiVersion?.minVersion ?? null;

        for(const row of input) {
            if(row.deviceSource) {
                // Easy mode
                const device = platformToDevice.get(row.deviceSource);
                if (!device) {
                    console.warn(`Unknown platformSource ${row.deviceSource}, skipping`);
                    continue;
                }

                if(runtimeMinVersion && !this.isVersionGreaterOrEqual(device.osVersion, runtimeMinVersion)) {
                    console.log(device.osVersion, '<', runtimeMinVersion);
                    ignoredDevices.push(device.deviceName);
                    continue;
                }

                sources.push(row.deviceSource);
                devices.push(device.deviceName);
            } else if(row.screenType && row.screenResolution && row.cpuPlatform) {
                // Generic model
                const [w, h] = row.screenResolution.split("x").map((r) => parseInt(r));
                const devs = await getDevicesByParams(row.screenType, w, h, row.cpuPlatform.toLowerCase());

                for(const row of devs) {
                    if(runtimeMinVersion && !this.isVersionGreaterOrEqual(row.osVersion, runtimeMinVersion)) {
                        ignoredDevices.push(row.deviceName);
                        continue;
                    }

                    devices.push(row.deviceName);
                    sources.push(...row.deviceSource);
                }
            } else {
                console.warn("Skip unsupported platform declaration schema", row);
            }
        }

        return [devices, sources, ignoredDevices];
    }

    async generate(baseUrl, withSubFolder) {
        const sourceUrl = {};
        const deviceQr = {};
        const files = {};
        const allIgnoredDevices = [];

        const isApp = this.bundle.appType === "app"
        const transformedBaseUrl = baseUrl.replace("https:", isApp ? "zpkd1:" : "watchface:");
        const basePath = withSubFolder ? "/" + this.bundle.appId : "";
        const entryExtension = isApp ? "zpk" : "json";
        const qrUrlTemplate = `${transformedBaseUrl}${basePath}/%basename%.${entryExtension}`;

        for(const row of this.bundle.manifest.zpks) {
            const deviceManifest = this.bundle.packagesDeviceManifests[row.name];
            const [devices, sources, ignoredDevices] = await this.parsePlatform(row.platforms, deviceManifest);
            allIgnoredDevices.push(...ignoredDevices);

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

        files["map.json"] = {
            "device_qr": flatMap(deviceQr),
            "source_redirect": flatMap(sourceUrl),
            "ignored_devices": Object.values(Object.fromEntries(allIgnoredDevices.map((i) => [i, i]))),
        }

        return files;
    }
}