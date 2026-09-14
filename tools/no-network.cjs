// Loaded with `node --require` when CI runs the demos: every TCP connection is refused, so a demo that reached the
// network would fail there. Local IPC stays allowed, because tsx talks to its own child process over a pipe.
const net = require('node:net');

const refuse = () => {
  throw new Error('network refused: the demos run with no network');
};

const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  // net.connect hands this method its arguments normalised into an array, so a pipe path is inside args[0].
  const first = Array.isArray(args[0]) ? args[0][0] : args[0];
  const ipc = (first && typeof first === 'object' && first.path) || (typeof first === 'string' && Number.isNaN(Number(first)));
  if (!ipc) refuse();
  return connect.apply(this, args);
};

if (typeof globalThis.fetch === 'function') globalThis.fetch = async () => refuse();
