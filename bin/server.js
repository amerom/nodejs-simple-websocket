require('dotenv').config();
const express = require('express');
const app = express();
const expressWs = require('express-ws')(app);
const router = express.Router();

const mysql = require('mysql');
const connectionPool = mysql.createPool({
    host     : process.env.DB_HOST,
    database : process.env.DB_NAME,
    user     : process.env.DB_USER,
    password : process.env.DB_PASS,
});

/**
 * Integer, to store last session revision count
 * @type {number}
 */
let lastRevisionCount = 0;

router.ws('/table', function(ws, req) {

    ws.on('message', (msg) => {

        let query = `SELECT COUNT(ar.id) AS revision_count FROM audit_revisions ar JOIN audit_${msg} al ON al.rev = ar.id`;

        connectionPool.query(query, (error, results) => {

            /**
             * Response Object
             * @type {{}}
             */
            let responseMessage = {
                reload: false,
                params: req.params
            };

            if (error) {

                responseMessage.error = true;
                responseMessage.code = error.code;
                responseMessage.message = error.sqlMessage;

                ws.send(JSON.stringify(responseMessage));
                return;
            }

            if (results[0] && results[0]['revision_count'] !== lastRevisionCount) {
                lastRevisionCount = results[0]['revision_count'];
                responseMessage.reload = true;
                responseMessage.lastRevisionCount = lastRevisionCount;
            }

            ws.send(JSON.stringify(responseMessage));

        });

    });
});

app.use('/audit', router);
app.listen(3000);