const http = require("http");
const WebSocket = require("ws");
const httpServer = http.createServer();
const wss = new WebSocket.Server({ server: httpServer });

httpServer.listen(8080);

const clientConnections = {};
const games = {};
let unmatchedClientIds = [];

wss.on("connection", connection => {
  const clientId = connectClient(connection);

  connection.on("close", () => {
    connection.close();
    const isLeftUnmachedClient = unmatchedClientIds.some(unmatchedClientId => unmatchedClientId === clientId);
    if (isLeftUnmachedClient) {
      unmatchedClientIds = unmatchedClientIds.filter(unmatchedClientId => unmatchedClientId !== clientId);
      return;
    }

    const gameId = clientConnections[clientId].gameId;
    const opponentClientId = games[gameId].clients[0] === clientId ? games[gameId].clients[1] : games[gameId].clients[0];
    clientConnections[opponentClientId].connection.send(JSON.stringify({
      method: "left",
      message: "opponent left",
    }));
  });

  matchClients(clientId);

  connection.on("message", message => {
    const result = JSON.parse(message);
    if (result.method === "click") {
      onClickHandler(result);
    }
  });
});

function connectClient(connection) {
  const clientId = createClientId();
  clientConnections[clientId] = {
    connection: connection,
  };

  connection.send(JSON.stringify({
    method: "connect",
    clientId: clientId,
  }));

  return clientId;
}

function matchClients(clientId) {
  unmatchedClientIds.push(clientId);

  if (unmatchedClientIds.length < 2) return;

  const gameId = createGameId();
  const firstClientId = unmatchedClientIds.shift();
  const secondClientId = unmatchedClientIds.shift();
  const game = {
    gameId: gameId,
    clients: [firstClientId, secondClientId],
  };
  game[firstClientId] = {
    simbol: "X",
    turn: "X",
  };
  game[secondClientId] = {
    simbol: "O",
    turn: "X",
  };
  games[gameId] = game;

  game.clients.forEach(joinedClientId => {
    clientConnections[joinedClientId].gameId = gameId;
    clientConnections[joinedClientId].connection.send(JSON.stringify({
      method: "join",
      game: game,
    }));
  });
}

function onClickHandler(result) {
  const game = games[result.gameId];

  if (checkWin(result.field)) {
    game.clients.forEach(joinedClientId => {
      clientConnections[joinedClientId].connection.send(JSON.stringify({
        method: "result",
        message: `${result.simbol} win`,
        field: result.field,
      }));
    });
    return;
  }

  if (checkDraw(result.field)) {
    game.clients.forEach(joinedClientId => {
      clientConnections[joinedClientId].connection.send(JSON.stringify({
        method: "result",
        message: "Draw",
        field: result.field,
      }));
    });
    return;
  }

  game.clients.forEach(joinedClientId => {
    clientConnections[joinedClientId].connection.send(JSON.stringify({
      method: "move",
      turn: result.simbol === "X" ? "O" : "X",
      field: result.field,
    }));
  });
}

const winningCombos = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],  // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8],  // Columns
  [0, 4, 8], [2, 4, 6]              // Diagonals
];

function checkWin(field) {
  for (const combo of winningCombos) {
    const [first, second, third] = combo;
    if (field[first] && field[first] === field[second] && field[first] === field[third]) {
      return true;
    }
  }

  return false;
}

function checkDraw(field) {
  return field.every(simbol => simbol === "X" || simbol === "O");
}

let clientIdCounter = 0;
function createClientId() {
  clientIdCounter++;
  return clientIdCounter;
}

let gameIdCounter = 0;
function createGameId() {
  gameIdCounter++;
  return gameIdCounter;
}
