const { TwitchChannel } = require("../lib");
const config = require("./config");

const channel = new TwitchChannel(config);

channel.on("log", (event) => {
  console.log("log", event);
});

channel.on("chat", (event) => {
  console.log("chat", event);
});
channel.on("cheer", (event) => {
  console.log("cheer", event);
});
channel.on("sub", (event) => {
  console.log("sub", event);
});
channel.on("resub", (event) => {
  console.log("resub", event);
});
channel.on("subgift", (event) => {
  console.log("subgift", event);
});
channel.on("host", (event) => {
  console.log("host", event);
});
channel.on("raid", (event) => {
  console.log("raid", event);
});
channel.on("follow", (event) => {
  console.log("follow", event);
});
channel.on("stream-begin", (event) => {
  console.log("stream-begin", event);
});
channel.on("stream-change-game", (event) => {
  console.log("stream-change-game", event);
});
channel.on("stream-end", (event) => {
  console.log("stream-end", event);
});
channel.on("ban", (event) => {
  console.log("ban", event);
});

channel.connect();
