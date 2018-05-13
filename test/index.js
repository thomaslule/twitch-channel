const Channel = require('..');
const options = require('./config');

const botChannel = Channel(options.bot);
const streamerChannel = Channel(options.streamer);

botChannel.on('chat', (...args) => { console.log('chat', args); });
botChannel.on('stream-begin', (...args) => { console.log('stream-begin', args); });
botChannel.on('stream-change-game', (...args) => { console.log('stream-change-game', args); });
botChannel.on('stream-end', (...args) => { console.log('stream-end', args); });
botChannel.on('top-clipper-change', (...args) => { console.log('top-clipper-change', args); });
botChannel.on('follow', (...args) => { console.log('follow', args); });
botChannel.connect();

streamerChannel.on('host', (...args) => { console.log('host', args); });
streamerChannel.connect();
