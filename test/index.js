const { TwitchChannel } = require('../lib');
const options = require('./config');

const channel = new TwitchChannel(options);

channel.on('info', msg => console.log(msg));
channel.on('error', msg => console.error(msg));

channel.on('chat', (...args) => { console.log('chat', args); });
channel.on('stream-begin', (...args) => { console.log('stream-begin', args); });
channel.on('stream-change-game', (...args) => { console.log('stream-change-game', args); });
channel.on('stream-end', (...args) => { console.log('stream-end', args); });
channel.on('follow', (...args) => { console.log('follow', args); });
channel.on('donation', (...args) => { console.log('donation', args); });
channel.on('host', (...args) => { console.log('host', args); });

channel.connect();
