import storage from "node-persist";

const home = process.env.APPDATA
    || (process.platform === 'darwin'
        ? process.env.HOME + '/Library/Preferences'
        : process.env.HOME + "/.local/share");

const dataDir = `${home.replaceAll("\\", "/")}/zepp_selfhost`

await storage.init({
    dir: dataDir,
});

export default storage;
