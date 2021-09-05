"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const offer_1 = require("./class/offer");
const answer_1 = require("./class/answer");
const candidate_1 = require("./class/candidate");
const express = require('express');
const router = express.Router();
// [{sessonId:[connectionId,...]}]
const clients = new Map();
// [{connectionId:[sessionId1, sessionId2]}]
const connectionPair = new Map(); // key = connectionId
// [{sessionId:[{connectionId:Offer},...]}]
const offers = new Map(); // key = sessionId
// [{sessionId:[{connectionId:Answer},...]}]
const answers = new Map(); // key = sessionId
// [{sessionId:[{connectionId:Candidate},...]}]
const candidates = new Map(); // key = sessionId
function getOrCreateConnectionIds(sessionId) {
    let connectionIds = null;
    if (!clients.has(sessionId)) {
        connectionIds = new Set();
        clients.set(sessionId, connectionIds);
    }
    connectionIds = clients.get(sessionId);
    return connectionIds;
}
router.use((req, res, next) => {
    if (req.url === '/') {
        next();
        return;
    }
    const id = req.header('session-id');
    if (!clients.has(id)) {
        res.sendStatus(404);
        return;
    }
    next();
});
router.get('/connection', (req, res) => {
    const sessionId = req.header('session-id');
    const arrayConnection = Array.from(clients.get(sessionId));
    const obj = arrayConnection.map((v) => ({ connectionId: v }));
    res.json({ connections: obj });
});
router.get('/offer', (req, res) => {
    // get `fromtime` parameter from request query
    const fromTime = req.query.fromtime ? Number(req.query.fromtime) : 0;
    const sessionId = req.header('session-id');
    let arrayOffers = [];
    if (offers.size != 0) {
        if (req.app.get('isPrivate')) {
            if (offers.has(sessionId)) {
                arrayOffers = Array.from(offers.get(sessionId));
            }
        }
        else {
            let otherSessionMap = Array.from(offers).filter(x => x[0] != sessionId);
            arrayOffers = [].concat(...Array.from(otherSessionMap, x => Array.from(x[1], y => [y[0], y[1]])));
        }
    }
    if (fromTime > 0) {
        arrayOffers = arrayOffers.filter((v) => v[1].datetime > fromTime);
    }
    const obj = arrayOffers.map((v) => ({ connectionId: v[0], sdp: v[1].sdp, polite: v[1].polite }));
    res.json({ offers: obj });
});
router.get('/answer', (req, res) => {
    // get `fromtime` parameter from request query
    const fromTime = req.query.fromtime ? Number(req.query.fromtime) : 0;
    const sessionId = req.header('session-id');
    let arrayOffers = [];
    if (answers.size != 0 && answers.has(sessionId)) {
        arrayOffers = Array.from(answers.get(sessionId));
    }
    if (fromTime > 0) {
        arrayOffers = arrayOffers.filter((v) => v[1].datetime > fromTime);
    }
    const obj = arrayOffers.map((v) => ({ connectionId: v[0], sdp: v[1].sdp }));
    res.json({ answers: obj });
});
router.get('/candidate', (req, res) => {
    // get `fromtime` parameter from request query
    const fromTime = req.query.fromtime ? Number(req.query.fromtime) : 0;
    const sessionId = req.header('session-id');
    const connectionIds = Array.from(clients.get(sessionId));
    const arr = [];
    for (const connectionId of connectionIds) {
        const pair = connectionPair.get(connectionId);
        if (pair == null) {
            continue;
        }
        const otherSessionId = sessionId === pair[0] ? pair[1] : pair[0];
        if (!candidates.get(otherSessionId) || !candidates.get(otherSessionId).get(connectionId)) {
            continue;
        }
        const arrayCandidates = candidates.get(otherSessionId).get(connectionId)
            .filter((v) => v.datetime > fromTime)
            .map((v) => ({ candidate: v.candidate, sdpMLineIndex: v.sdpMLineIndex, sdpMid: v.sdpMid }));
        if (arrayCandidates.length === 0) {
            continue;
        }
        arr.push({ connectionId, candidates: arrayCandidates });
    }
    res.json({ candidates: arr });
});
router.put('', (req, res) => {
    const id = uuid_1.v4();
    clients.set(id, new Set());
    offers.set(id, new Map());
    answers.set(id, new Map());
    candidates.set(id, new Map());
    res.json({ sessionId: id });
});
router.delete('', (req, res) => {
    const id = req.header('session-id');
    offers.delete(id);
    answers.delete(id);
    candidates.delete(id);
    clients.delete(id);
    res.sendStatus(200);
});
router.put('/connection', (req, res) => {
    const sessionId = req.header('session-id');
    const { connectionId } = req.body;
    if (connectionId == null) {
        res.status(400).send({ error: new Error(`connectionId is required`) });
        return;
    }
    let polite = true;
    if (req.app.get('isPrivate')) {
        if (connectionPair.has(connectionId)) {
            const pair = connectionPair.get(connectionId);
            if (pair[0] != null && pair[1] != null) {
                const err = new Error(`${connectionId}: This connection id is already used.`);
                console.log(err);
                res.status(400).send({ error: err });
                return;
            }
            else if (pair[0] != null) {
                connectionPair.set(connectionId, [pair[0], sessionId]);
                const map = getOrCreateConnectionIds(pair[0]);
                map.add(connectionId);
            }
        }
        else {
            connectionPair.set(connectionId, [sessionId, null]);
            polite = false;
        }
    }
    const connectionIds = getOrCreateConnectionIds(sessionId);
    connectionIds.add(connectionId);
    res.json({ connectionId: connectionId, polite: polite });
});
router.delete('/connection', (req, res) => {
    const sessionId = req.header('session-id');
    const { connectionId } = req.body;
    clients.get(sessionId).delete(connectionId);
    if (connectionPair.has(connectionId)) {
        const pair = connectionPair.get(connectionId);
        const otherSessionId = pair[0] == sessionId ? pair[1] : pair[0];
        if (otherSessionId) {
            if (clients.has(otherSessionId)) {
                clients.get(otherSessionId).delete(connectionId);
            }
        }
    }
    connectionPair.delete(connectionId);
    offers.get(sessionId).delete(connectionId);
    answers.get(sessionId).delete(connectionId);
    candidates.get(sessionId).delete(connectionId);
    res.json({ connectionId: connectionId });
});
router.post('/offer', (req, res) => {
    const sessionId = req.header('session-id');
    const { connectionId } = req.body;
    let keySessionId = null;
    let polite = false;
    if (res.app.get('isPrivate')) {
        if (connectionPair.has(connectionId)) {
            const pair = connectionPair.get(connectionId);
            keySessionId = pair[0] == sessionId ? pair[1] : pair[0];
            if (keySessionId != null) {
                polite = true;
                const map = offers.get(keySessionId);
                map.set(connectionId, new offer_1.default(req.body.sdp, Date.now(), polite));
            }
        }
        res.sendStatus(200);
        return;
    }
    connectionPair.set(connectionId, [sessionId, null]);
    keySessionId = sessionId;
    const map = offers.get(keySessionId);
    map.set(connectionId, new offer_1.default(req.body.sdp, Date.now(), polite));
    res.sendStatus(200);
});
router.post('/answer', (req, res) => {
    const sessionId = req.header('session-id');
    const { connectionId } = req.body;
    const connectionIds = getOrCreateConnectionIds(sessionId);
    connectionIds.add(connectionId);
    if (!connectionPair.has(connectionId)) {
        res.sendStatus(200);
        return;
    }
    // add connectionPair
    const pair = connectionPair.get(connectionId);
    const otherSessionId = pair[0] == sessionId ? pair[1] : pair[0];
    if (!res.app.get('isPrivate')) {
        connectionPair.set(connectionId, [otherSessionId, sessionId]);
    }
    const map = answers.get(otherSessionId);
    map.set(connectionId, new answer_1.default(req.body.sdp, Date.now()));
    // update datetime for candidates
    const mapCandidates = candidates.get(otherSessionId);
    if (mapCandidates) {
        const arrayCandidates = mapCandidates.get(connectionId);
        if (arrayCandidates) {
            for (const candidate of arrayCandidates) {
                candidate.datetime = Date.now();
            }
        }
    }
    res.sendStatus(200);
});
router.post('/candidate', (req, res) => {
    const sessionId = req.header('session-id');
    const { connectionId } = req.body;
    const map = candidates.get(sessionId);
    if (!map.has(connectionId)) {
        map.set(connectionId, []);
    }
    const arr = map.get(connectionId);
    const candidate = new candidate_1.default(req.body.candidate, req.body.sdpMLineIndex, req.body.sdpMid, Date.now());
    arr.push(candidate);
    res.sendStatus(200);
});
exports.default = router;
//# sourceMappingURL=signaling.js.map