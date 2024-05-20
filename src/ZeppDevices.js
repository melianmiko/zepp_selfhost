let cachedDevices = null;
import storage from "./storage.js";

const CACHE_LIFETIME = 1000 * 3600 * 24 * 7; // 7d

export async function getZeppDevices() {
    if(!cachedDevices) {
        if(!(await storage.getItem("devices")) || await storage.getItem("devicesExpire") <= Date.now()) {
            console.log("Downloading new zepp_devices.json...");
            const r = await fetch("https://github.com/melianmiko/ZeppOS-DevicesList/raw/main/zepp_devices.json");
            if(r.status !== 200)
                throw new Error("Can't fetch zepp_devices.json map");
            cachedDevices = await r.json();
            await storage.setItem("devices", JSON.stringify(cachedDevices));
            await storage.setItem("devicesExpire", Date.now() + CACHE_LIFETIME);
        } else {
            cachedDevices = JSON.parse(await storage.getItem("devices"));
        }
    }

    return cachedDevices;
}

export async function getDevicesByParams(screenType, width, height, chipset) {
    // Convert to ZeppDevices variant
    if(screenType === "bar")
        screenType = "band";

    // Mi Band 7 zeus fix
    if(chipset === "dialog" && width === 192 && height === 349)
        height = 490;

    const devices = [];
    for(const dev of await getZeppDevices()) {
        if(dev.chipset === chipset
            && dev.screenShape === screenType
            && dev.screenWidth === width
            && dev.screenHeight === height
        ) {
            devices.push(dev);
        }
    }

    return devices;
}

export async function getAllKnownDeviceNames() {
    return (await getZeppDevices()).map((row) => row.deviceName);
}

export async function getPlatformToDeviceMap() {
    const data = await getZeppDevices();
    const out = new Map();
    for(const row of data) {
        for(const source of row.deviceSource)
            out.set(source, row);
    }
    return out;
}
