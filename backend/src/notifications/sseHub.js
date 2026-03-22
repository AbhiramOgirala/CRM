'use strict';

const userStreams = new Map();

const addClient = (userId, res) => {
  if (!userStreams.has(userId)) userStreams.set(userId, new Set());
  userStreams.get(userId).add(res);
};

const removeClient = (userId, res) => {
  const streams = userStreams.get(userId);
  if (!streams) return;
  streams.delete(res);
  if (streams.size === 0) userStreams.delete(userId);
};

const emitToUser = (userId, event, payload) => {
  const streams = userStreams.get(userId);
  if (!streams || streams.size === 0) return;

  const message = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const stream of streams) {
    try {
      stream.write(message);
    } catch {
      removeClient(userId, stream);
    }
  }
};

module.exports = {
  addClient,
  removeClient,
  emitToUser,
};
