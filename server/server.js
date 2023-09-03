const http = require("http");
const WebsocketServer = require("websocket").server;
const httpServer = http.createServer();
httpServer.listen(8080);

let clientIdCounter = 0;
let gameIdCounter = 0;
const clientConnections = {};
const games = {};
let unmatchedClientIds = [];

const wsServer = new WebsocketServer({ "httpServer": httpServer });
wsServer.on("request", request => {
  const connection = request.accept(null, request.origin);
  const clientId = connectClient(connection);

  connection.on('close', () => {
    unmatchedClientIds = unmatchedClientIds.filter(unmatchedClientId => unmatchedClientId !== clientId);
    connection.close();
  });

  matchClients(clientId);

  connection.on("message", message => {
    const result = JSON.parse(message.utf8Data);

    if (result.method === "click") { onClickHandler(result); }
  });
});

function connectClient(connection) {
  const clientId = createClientId();
  clientConnections[clientId] = {
    "connection": connection
  };

  connection.send(JSON.stringify({
    "method": "connect",
    "clientId": clientId,
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
    "gameId": gameId,
    "clients": [firstClientId, secondClientId],
  };
  game[firstClientId] = {
    "simbol": "X",
    "move": "X",
  };
  game[secondClientId] = {
    "simbol": "O",
    "move": "X",
  };
  games[gameId] = game;

  game.clients.forEach(joinedClientId => {
    clientConnections[joinedClientId].connection.send(JSON.stringify({
      "method": "join",
      "game": game,
    }));
  });
}

function onClickHandler(result) {
  const game = games[result.gameId];

  if (checkWin(result.field)) {
    game.clients.forEach(joinedClientId => {
      clientConnections[joinedClientId].connection.send(JSON.stringify({
        "method": "result",
        "message": `${result.simbol} win!`,
      }));
    });
    return;
  }

  if (checkDraw(result.field)) {
    game.clients.forEach(joinedClientId => {
      clientConnections[joinedClientId].connection.send(JSON.stringify({
        "method": "result",
        "message": "Draw!",
      }));
    });
    return;
  }

  game.clients.forEach(joinedClientId => {
    clientConnections[joinedClientId].connection.send(JSON.stringify({
      "method": "move",
      "move": result.simbol === "X" ? "O" : "X",
      "field": result.field,
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

function createClientId() {
  clientIdCounter++;
  return clientIdCounter;
}

function createGameId() {
  gameIdCounter++;
  return gameIdCounter;
}