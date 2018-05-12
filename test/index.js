const Channel = require('..');
const options = require('./config');

const channel = Channel(options);

channel.on('chat', (...args) => { console.log('chat', args); });
channel.on('stream-begin', (...args) => { console.log('stream-begin', args); });
channel.on('stream-change-game', (...args) => { console.log('stream-change-game', args); });
channel.on('stream-end', (...args) => { console.log('stream-end', args); });
channel.on('top-clipper-change', (...args) => { console.log('top-clipper-change', args); });
channel.connect();
