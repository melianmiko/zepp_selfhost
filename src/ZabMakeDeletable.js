export class ZabMakeDeletable {
    static apply(bundle) {
        new ZabMakeDeletable(bundle).apply();
    }

    /**
     * @param {ZeppBundle} bundle
     */
    constructor(bundle) {
        this.bundle = bundle
    }

    apply() {
        for(const pkgName in this.bundle.packages) {
            for(const zipName in this.bundle.packages[pkgName]) {
                const files = this.bundle.packages[pkgName][zipName];
                if(!files["app.json"]) {
                    console.warn(`ZabMakeDeletable: Not applied to ZAB/${pkgName}/${zipName}, app.json not found`);
                    continue;
                }

                const appJson = JSON.parse(files["app.json"].toString("utf8"));
                const currentMode = appJson.packageInfo?.mode;
                if(!currentMode) {
                    console.warn(`ZabMakeDeletable: Not applied to ZAB/${pkgName}/${zipName}, mode not defined`);
                    continue;
                }
                appJson.packageInfo.mode = "preview";
                files["app.json"] = Buffer.from(JSON.stringify(appJson));
            }
        }
    }
}