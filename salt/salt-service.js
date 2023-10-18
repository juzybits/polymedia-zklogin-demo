'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const bigInt = require('big-integer');

const PORT = 5002;
const HOST = '0.0.0.0';

const app = express();

// Parse JSON requests
app.use(bodyParser.json());

// TODO: For now, we're ignoring the JWT token and always returning the same salt.
// https://docs.sui.io/build/zk_login#user-salt-management
app.post('/get-salt', (req, res) => {
    const salt = '129390038577185583942388216820280642146';
    res.json({ salt });
});

app.listen(PORT, HOST, () => {
    console.log(`Salt service running on http://localhost:${PORT}`);
});
