require('dotenv').config();
const _ = require('lodash');
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

/**
 *
 * @param ws
 * @param msg
 */
const send = function(ws, msg) {

    if (1 === ws.readyState) {
        ws.send(msg);
    }
};

app.use('/topic/subscribe', router);


router.ws('/lead', (ws, req) => {

    let lastRevisionCount = 0;

    let timer = setInterval(_.debounce(() => {
        connectionPool.query(
            `
                SELECT COUNT(ar.id) AS revision_count 
                FROM audit_revisions ar JOIN audit_lead al ON al.rev = ar.id
                WHERE ar.timestamp >= DATE_SUB(NOW(), INTERVAL 1 HOUR);
            `,
            (error, results) => {

                let responseMessage = {
                    reload: false,
                    params: req.params
                };

                if (error) {

                    responseMessage['error'] = true;
                    responseMessage['code'] = error.code;
                    responseMessage['message'] = error.sqlMessage;

                    send(ws, JSON.stringify(responseMessage));
                    return;
                }

                if (results[0] && results[0]['revision_count'] !== lastRevisionCount) {
                    lastRevisionCount = results[0]['revision_count'];
                    responseMessage['reload'] = true;
                    responseMessage['lastRevisionCount'] = lastRevisionCount;
                }

                send(ws, JSON.stringify(responseMessage));
            }
        );
    }, 500), 1500);

    ws.on('close', () => {
        clearInterval(timer);
        timer = null;
    });
});

router.ws('/campaign', (ws, req) => {

    let lastRevisionCount = 0;

    let timer = setInterval(_.debounce(() => {
        connectionPool.query(
            `
                SELECT COUNT(ac.id) AS revision_count 
                FROM audit_revisions ar JOIN audit_campaign ac ON ac.rev = ar.id
                WHERE ar.timestamp >= DATE_SUB(NOW(), INTERVAL 1 HOUR);
            `,
            (error, results) => {

                let responseMessage = {
                    reload: false,
                    params: req.params
                };

                if (error) {

                    responseMessage['error'] = true;
                    responseMessage['code'] = error.code;
                    responseMessage['message'] = error.sqlMessage;

                    send(ws, JSON.stringify(responseMessage));
                    return;
                }

                if (results[0] && results[0]['revision_count'] !== lastRevisionCount) {
                    lastRevisionCount = results[0]['revision_count'];
                    responseMessage['reload'] = true;
                    responseMessage['lastRevisionCount'] = lastRevisionCount;
                }

                send(ws, JSON.stringify(responseMessage));
            }
        );
    }, 500), 1500);

    ws.on('close', () => {
        clearInterval(timer);
        timer = null;
    });
});

app.listen(process.env.WS_PORT);