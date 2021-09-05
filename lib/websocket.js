"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const websocket = require("ws");
const offer_1 = require("./class/offer");
const answer_1 = require("./class/answer");
const candidate_1 = require("./class/candidate");
// [{sessonId:[connectionId,...]}]
const clients = new Map();
// [{connectionId:[sessionId1, sessionId2]}]
const connectionPair = new Map();
function getOrCreateConnectionIds(settion) {
    let connectionIds = null;
    if (!clients.has(settion)) {
        connectionIds = new Set();
        clients.set(settion, connectionIds);
    }
    connectionIds = clients.get(settion);
    return connectionIds;
}
class WSSignaling {
    constructor(server, mode) {
        this.server = server;
        this.wss = new websocket.Server({ server });
        this.isPrivate = mode == "private";
        this.wss.on('connection', (ws) => {
            clients.set(ws, new Set());
            ws.onclose = (_event) => {
                const connectionIds = clients.get(ws);
                connectionIds.forEach(connectionId => {
                    const pair = connectionPair.get(connectionId);
                    if (pair) {
                        const otherSessionWs = pair[0] == ws ? pair[1] : pair[0];
                        if (otherSessionWs) {
                            otherSessionWs.send(JSON.stringify({ type: "disconnect", connectionId: connectionId }));
                        }
                    }
                    connectionPair.delete(connectionId);
                });
                clients.delete(ws);
            };
            ws.onmessage = (event) => {
                // type: connect, disconnect JSON Schema
                // connectionId: connect or disconnect connectionId
                // type: offer, answer, candidate JSON Schema
                // from: from connection id
                // to: to connection id
                // data: any message data structure
                const msg = JSON.parse(event.data);
                if (!msg || !this) {
                    return;
                }
                console.log(msg);
                switch (msg.type) {
                    case "connect":
                        this.onConnect(ws, msg.connectionId);
                        break;
                    case "disconnect":
                        this.onDisconnect(ws, msg.connectionId);
                        break;
                    case "offer":
                        this.onOffer(ws, msg.data);
                        break;
                    case "answer":
                        this.onAnswer(ws, msg.data);
                        break;
                    case "candidate":
                        this.onCandidate(ws, msg.data);
                        break;
                    default:
                        break;
                }
            };
        });
    }
    onConnect(ws, connectionId) {
        let polite = true;
        if (this.isPrivate) {
            if (connectionPair.has(connectionId)) {
                const pair = connectionPair.get(connectionId);
                if (pair[0] != null && pair[1] != null) {
                    ws.send(JSON.stringify({ type: "error", message: `${connectionId}: This connection id is already used.` }));
                    return;
                }
                else if (pair[0] != null) {
                    connectionPair.set(connectionId, [pair[0], ws]);
                }
            }
            else {
                connectionPair.set(connectionId, [ws, null]);
                polite = false;
            }
        }
        const connectionIds = getOrCreateConnectionIds(ws);
        connectionIds.add(connectionId);
        ws.send(JSON.stringify({ type: "connect", connectionId: connectionId, polite: polite }));
    }
    onDisconnect(ws, connectionId) {
        const connectionIds = clients.get(ws);
        connectionIds.delete(connectionId);
        if (connectionPair.has(connectionId)) {
            const pair = connectionPair.get(connectionId);
            const otherSessionWs = pair[0] == ws ? pair[1] : pair[0];
            if (otherSessionWs) {
                otherSessionWs.send(JSON.stringify({ type: "disconnect", connectionId: connectionId }));
            }
        }
        connectionPair.delete(connectionId);
        ws.send(JSON.stringify({ type: "disconnect", connectionId: connectionId }));
    }
    onOffer(ws, message) {
        const connectionId = message.connectionId;
        let newOffer = new offer_1.default(message.sdp, Date.now(), false);
        if (this.isPrivate) {
            if (connectionPair.has(connectionId)) {
                const pair = connectionPair.get(connectionId);
                const otherSessionWs = pair[0] == ws ? pair[1] : pair[0];
                if (otherSessionWs) {
                    newOffer.polite = true;
                    otherSessionWs.send(JSON.stringify({ from: connectionId, to: "", type: "offer", data: newOffer }));
                }
            }
            return;
        }
        connectionPair.set(connectionId, [ws, null]);
        clients.forEach((_v, k) => {
            if (k == ws) {
                return;
            }
            k.send(JSON.stringify({ from: connectionId, to: "", type: "offer", data: newOffer }));
        });
    }
    onAnswer(ws, message) {
        const connectionId = message.connectionId;
        const connectionIds = getOrCreateConnectionIds(ws);
        connectionIds.add(connectionId);
        const newAnswer = new answer_1.default(message.sdp, Date.now());
        if (!connectionPair.has(connectionId)) {
            return;
        }
        const pair = connectionPair.get(connectionId);
        const otherSessionWs = pair[0] == ws ? pair[1] : pair[0];
        if (!this.isPrivate) {
            connectionPair.set(connectionId, [otherSessionWs, ws]);
        }
        otherSessionWs.send(JSON.stringify({ from: connectionId, to: "", type: "answer", data: newAnswer }));
    }
    onCandidate(ws, message) {
        const connectionId = message.connectionId;
        const candidate = new candidate_1.default(message.candidate, message.sdpMLineIndex, message.sdpMid, Date.now());
        if (this.isPrivate) {
            if (connectionPair.has(connectionId)) {
                const pair = connectionPair.get(connectionId);
                const otherSessionWs = pair[0] == ws ? pair[1] : pair[0];
                if (otherSessionWs) {
                    otherSessionWs.send(JSON.stringify({ from: connectionId, to: "", type: "candidate", data: candidate }));
                }
            }
            return;
        }
        clients.forEach((_v, k) => {
            if (k === ws) {
                return;
            }
            k.send(JSON.stringify({ from: connectionId, to: "", type: "candidate", data: candidate }));
        });
    }
}
exports.default = WSSignaling;
//# sourceMappingURL=websocket.js.map