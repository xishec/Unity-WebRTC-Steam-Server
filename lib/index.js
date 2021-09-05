"use strict";
// import * as functions from 'firebase-functions';
Object.defineProperty(exports, "__esModule", { value: true });
// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
// export const helloWorld = functions.https.onRequest((request, response) => {
// 	functions.logger.info('Hello logs!', {structuredData: true});
// 	response.send('Hello from Firebase!');
// });
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const signaling_1 = require("./signaling");
var cors = require('cors');
const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.get('/config', (req, res) => res.json({ useWebSocket: true, startupMode: 'public', logging: 'dev' }));
app.use('/signaling', signaling_1.default);
app.use(express.static(path.join(__dirname, '../public')));
app.get('/', (req, res) => {
    // functions.logger.info('Hello logs!', {structuredData: true});
    res.send('Hello from Firebase! at 508');
});
// export const helloWorld = functions.https.onRequest(app);
const port = 3000;
app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});
//# sourceMappingURL=index.js.map