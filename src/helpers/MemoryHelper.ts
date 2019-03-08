import { Helper } from "../lib/decorators/injection";

@Helper()
export class MemoryHelper {

    getMemoryUsage() {
        const used = this.getMemoryUsageRaw();
        let obj = {};
        for (let key in used) {
            obj[key] = this.bytesToSize(used[key]);
        }
        return obj;
    }

    getMemoryUsageRaw() {
        return process.memoryUsage();
    }

    private bytesToSize(bytes) {
        var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes == 0) return '0 Byte';
        var i = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
    };

}