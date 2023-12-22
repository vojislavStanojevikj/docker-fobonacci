const keys = require('./keys');
const redis = require('redis');
const REDIS_HASH_SET_NAME = 'values';

const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000
});

function fibonacci(index) {
    if (index < 2) return 1;
    return fibonacci(index - 1) + fibonacci(index - 2);
}

const subscriber = redisClient.duplicate();

subscriber.on('message', (channel, message) => {
    redisClient.hset(REDIS_HASH_SET_NAME, message, fibonacci(parseInt(message)));
});

subscriber.subscribe('insert');