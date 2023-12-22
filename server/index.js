const keys = require('./keys');

// Express App setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());


// Postgres client setup
const { Pool } = require('pg');

const pgClient = new Pool({
    host: keys.pgHost,
    port: keys.pgPort,
    user: keys.pgUser,
    password: keys.pgPassword,
    database: keys.pgDatabase,
    ssl: process.env.NODE_ENV !== 'production' ? false : { rejectUnauthorized: false }
});

pgClient.on("connect", (client) => {
    client
        .query("CREATE TABLE IF NOT EXISTS values (number INT)")
        .catch((err) => console.error(err));
});


// Redis client setup
const redis = require('redis');
const REDIS_HASH_SET_NAME = 'values';

const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000
});

const redisPublisher = redisClient.duplicate();

// Express route handlers
app.get('/', (req, res) => {
    res.send('Hi there');
});

app.get('/values/all', async (req, res) => {
    const values = await pgClient.query('SELECT * FROM values');
    res.send(values.rows)
});

app.get('/values/current', async (req, res) => {
    redisClient.hgetall(REDIS_HASH_SET_NAME, (err, values) => {
        res.send(values);
    });
});

app.post('/values', (req, res) => {

    const index = req.body.index;

    if (parseInt(index) > 40) return res.status(422).send('Index to high!');

    redisClient.hset(REDIS_HASH_SET_NAME, index, 'EMPTY');
    redisPublisher.publish('insert', index);
    pgClient.query('INSERT INTO values (number) VALUES ($1)', [index]);

    res.send({ working: true });
});

app.listen(5000, (error) => {
   console.log('Listening on port 5000');
});