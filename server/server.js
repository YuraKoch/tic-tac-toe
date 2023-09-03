const http = require("http");
const WebsocketServer = require("websocket").server
const httpServer = http.createServer();
httpServer.listen(8080, () => console.log("Listening.. on 8080"));

let clientIdCounter = 0;
let gameIdCounter = 0;
const clientConnections = {};
const games = {};
let unmatchedClientIds = [];

const wsServer = new WebsocketServer({ "httpServer": httpServer });
wsServer.on("request", request => {
  const connection = request.accept(null, request.origin);
  const clientId = connectClient(connection);

  // Обработчик события закрытия соединения
  connection.on('close', (reasonCode, description) => {
    console.log(`Клиент отключился. Код: ${reasonCode}, Причина: ${description}`);
    unmatchedClientIds = unmatchedClientIds.filter(unmatchedClientId => unmatchedClientId !== clientId);
    connection.close();
  });

  matchClients(clientId);

  connection.on("message", message => {
    const result = JSON.parse(message.utf8Data);

    if (result.method === "click") {
      const game = games[result.gameId];

      game.clients.forEach(joinedClientId => {
        clientConnections[joinedClientId].connection.send(JSON.stringify({
          "method": "move",
          "move": result.simbol === "X" ? "O" : "X",
          "field": result.field,
        }));
      });
    }
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



function createClientId() {
  clientIdCounter++;
  return clientIdCounter;
}

function createGameId() {
  gameIdCounter++;
  return gameIdCounter;
}