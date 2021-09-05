"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = void 0;
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
const morgan = require("morgan");
const signaling_1 = require("./signaling");
const log_1 = require("./log");
exports.createServer = (config) => {
    const app = express();
    app.set('isPrivate', config.mode == "private");
    // logging http access
    if (config.logging != "none") {
        app.use(morgan(config.logging));
    }
    // const signal = require('./signaling');
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    app.get('/config', (req, res) => res.json({ useWebSocket: config.websocket, startupMode: config.mode, logging: config.logging }));
    app.use('/signaling', signaling_1.default);
    app.use(express.static(path.join(__dirname, '../public')));
    app.get('/', (req, res) => {
        const indexPagePath = path.join(__dirname, '../public/index.html');
        fs.access(indexPagePath, (err) => {
            if (err) {
                log_1.log(log_1.LogLevel.warn, `Can't find file ' ${indexPagePath}`);
                res.status(404).send(`Can't find file ${indexPagePath}`);
            }
            else {
                res.sendFile(indexPagePath);
            }
        });
    });
    return app;
};
//# sourceMappingURL=server.js.map