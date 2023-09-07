const http = require("http");
const WebSocket = require("ws");
const httpServer = http.createServer();
const wss = new WebSocket.Server({ server: httpServer });

httpServer.listen(8080);

const clientConnections = {};
const opponents = {};
let clientIdsWaitingMatch = [];

wss.on("connection", connection => {
  const clientId = connectClient(connection);

  matchClients(clientId);

  connection.on("message", message => {
    const result = JSON.parse(message);
    if (result.method === "move") {
      moveHandler(result, clientId);
    }
  });

  connection.on("close", () => {
    closeClient(connection, clientId);
  });
});

function connectClient(connection) {
  const clientId = createClientId();
  clientConnections[clientId] = { connection };
  return clientId;
}

function matchClients(clientId) {
  clientIdsWaitingMatch.push(clientId);

  if (clientIdsWaitingMatch.length < 2) return;

  const firstClientId = clientIdsWaitingMatch.shift();
  const secondClientId = clientIdsWaitingMatch.shift();

  opponents[firstClientId] = secondClientId;
  opponents[secondClientId] = firstClientId;

  clientConnections[firstClientId].connection.send(JSON.stringify({
    method: "join",
    simbol: "X",
    turn: "X"
  }));

  clientConnections[secondClientId].connection.send(JSON.stringify({
    method: "join",
    simbol: "O",
    turn: "X"
  }));
}

function moveHandler(result, clientId) {
  const opponentClientId = opponents[clientId];

  if (checkWin(result.field)) {
    [clientId, opponentClientId].forEach(cId => {
      clientConnections[cId].connection.send(JSON.stringify({
        method: "result",
        message: `${result.simbol} win`,
        field: result.field,
      }));
    });
    return;
  }

  if (checkDraw(result.field)) {
    [clientId, opponentClientId].forEach(cId => {
      clientConnections[cId].connection.send(JSON.stringify({
        method: "result",
        message: "Draw",
        field: result.field,
      }));
    });
    return;
  }

  [clientId, opponentClientId].forEach(cId => {
    clientConnections[cId].connection.send(JSON.stringify({
      method: "update",
      turn: result.simbol === "X" ? "O" : "X",
      field: result.field,
    }));
  });
}

function closeClient(connection, clientId) {
  connection.close();
  const isLeftUnmachedClient = clientIdsWaitingMatch.some(unmatchedClientId => unmatchedClientId === clientId);

  if (isLeftUnmachedClient) {
    clientIdsWaitingMatch = clientIdsWaitingMatch.filter(unmatchedClientId => unmatchedClientId !== clientId);
  } else {
    const opponentClientId = opponents[clientId];
    clientConnections[opponentClientId].connection.send(JSON.stringify({
      method: "left",
      message: "opponent left",
    }));
  }
}

const winningCombos = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],  // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8],  // Columns
  [0, 4, 8], [2, 4, 6]              // Diagonals
];

function checkWin(field) {
  return winningCombos.some(combo => {
    const [first, second, third] = combo;
    return field[first] !== "" && field[first] === field[second] && field[first] === field[third];
  });
}

function checkDraw(field) {
  return field.every(simbol => simbol === "X" || simbol === "O");
}

let clientIdCounter = 0;
function createClientId() {
  clientIdCounter++;
  return clientIdCounter;
}
