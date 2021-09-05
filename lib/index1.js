"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RenderStreaming = void 0;
const https = require("https");
const fs = require("fs");
const os = require("os");
const server_1 = require("./server");
const websocket_1 = require("./websocket");
class RenderStreaming {
    constructor(options) {
        this.options = options;
        this.app = server_1.createServer(this.options);
        if (this.options.secure) {
            this.server = https.createServer({
                key: fs.readFileSync(options.keyfile),
                cert: fs.readFileSync(options.certfile),
            }, this.app).listen(this.options.port, () => {
                const { port } = this.server.address();
                const addresses = this.getIPAddress();
                for (const address of addresses) {
                    console.log(`https://${address}:${port}`);
                }
            });
        }
        else {
            this.server = this.app.listen(this.options.port, () => {
                const { port } = this.server.address();
                const addresses = this.getIPAddress();
                for (const address of addresses) {
                    console.log(`http://${address}:${port}`);
                }
            });
        }
        if (this.options.websocket) {
            console.log(`start websocket signaling server ws://${this.getIPAddress()[0]}`);
            //Start Websocket Signaling server
            new websocket_1.default(this.server, this.options.mode);
        }
        console.log(`start as ${this.options.mode} mode`);
    }
    static run(argv) {
        const program = require('commander');
        const readOptions = () => {
            if (Array.isArray(argv)) {
                program
                    .usage('[options] <apps...>')
                    .option('-p, --port <n>', 'Port to start the server on', process.env.PORT || 80)
                    .option('-s, --secure', 'Enable HTTPS (you need server.key and server.cert)', process.env.SECURE || false)
                    .option('-k, --keyfile <path>', 'https key file (default server.key)', process.env.KEYFILE || 'server.key')
                    .option('-c, --certfile <path>', 'https cert file (default server.cert)', process.env.CERTFILE || 'server.cert')
                    .option('-w, --websocket', 'Enable Websocket Signaling', process.env.WEBSOCKET || false)
                    .option('-m, --mode <type>', 'Choose Communication mode public or private (default public)', process.env.MODE || 'public')
                    .option('-l, --logging <type>', 'Choose http logging type combined, dev, short, tiny or none.(default dev)', process.env.LOGGING || 'dev')
                    .parse(argv);
                return {
                    port: program.port,
                    secure: program.secure == undefined ? false : program.secure,
                    keyfile: program.keyfile,
                    certfile: program.certfile,
                    websocket: program.websocket == undefined ? false : program.websocket,
                    mode: program.mode,
                    logging: program.logging,
                };
            }
        };
        const options = readOptions();
        return new RenderStreaming(options);
    }
    getIPAddress() {
        const interfaces = os.networkInterfaces();
        const addresses = [];
        for (const k in interfaces) {
            for (const k2 in interfaces[k]) {
                const address = interfaces[k][k2];
                if (address.family === 'IPv4') {
                    addresses.push(address.address);
                }
            }
        }
        return addresses;
    }
}
exports.RenderStreaming = RenderStreaming;
RenderStreaming.run(process.argv);
//# sourceMappingURL=index1.js.map