const express = require('express');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const {addUser} = require('../mongo/user-controller');
const mongoose = require('mongoose');

const app = express();
app.use(express.static(path.join(__dirname, '..', 'client')));

const httpServer = http.createServer(app);
const wss = new WebSocket.Server({ server: httpServer });

const URL = 'mongodb://0.0.0.0:27017/ws';

mongoose
  .connect(URL, {})
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('DB connection error:', err));


const PORT = 3000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


const clientConnections = {};
const opponents = {};
let clientIdsWaitingMatch = [];

wss.on('connection', (connection) => {
  const clientId = createClientId();
  clientConnections[clientId] = connection;

  matchClients(clientId);

  connection.on('message', async (message) => {
    const result = JSON.parse(message);
    console.log('res',result)

    if (result.method === 'setName') {
      const playerName = result.playerName;
      clientConnections[clientId].playerName = playerName;

      try {
        const newUser = await addUser(playerName);
          
        console.log('Имя пользователя сохранено в базе:', newUser);
      } catch (error) {
        console.error('Ошибка при сохранении имени пользователя в базе:', error);
      }

      // ////// matchClients(clientId);
    } else if (result.method === 'move') {
      moveHandler(result, clientId);
    }
  });

  connection.on('close', () => {
    closeClient(connection, clientId);
  });
});

function matchClients(clientId) {
  clientIdsWaitingMatch.push(clientId);

  if (clientIdsWaitingMatch.length < 2) return;

  const firstClientId = clientIdsWaitingMatch.shift();
  const secondClientId = clientIdsWaitingMatch.shift();

  opponents[firstClientId] = secondClientId;
  opponents[secondClientId] = firstClientId;

  clientConnections[firstClientId].send(JSON.stringify({
    method: "join",
    symbol: "X",
    turn: "X"
  }));

  clientConnections[secondClientId].send(JSON.stringify({
    method: "join",
    symbol: "O",
    turn: "X"
  }));
}

function moveHandler(result, clientId) {
  const opponentClientId = opponents[clientId];

  if (checkWin(result.field)) {
    [clientId, opponentClientId].forEach(cId => {
      clientConnections[cId].send(JSON.stringify({
        method: "result",
        message: `${result.symbol} win`,
        field: result.field,
      }));
    });
    return;
  }

  if (checkDraw(result.field)) {
    [clientId, opponentClientId].forEach(cId => {
      clientConnections[cId].send(JSON.stringify({
        method: "result",
        message: "Draw",
        field: result.field,
      }));
    });
    return;
  }

  [clientId, opponentClientId].forEach(cId => {
    clientConnections[cId].send(JSON.stringify({
      method: "update",
      turn: result.symbol === "X" ? "O" : "X",
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
    clientConnections[opponentClientId].send(JSON.stringify({
      method: "left",
      message: "opponent left",
    }));
  }
}

const winningCombos = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], 
  [0, 3, 6], [1, 4, 7], [2, 5, 8], 
  [0, 4, 8], [2, 4, 6]             
];

function checkWin(field) {
  return winningCombos.some(combo => {
    const [first, second, third] = combo;
    return field[first] !== "" && field[first] === field[second] && field[first] === field[third];
  });
}

function checkDraw(field) {
  return field.every(symbol => symbol === "X" || symbol === "O");
}

let clientIdCounter = 0;
function createClientId() {
  clientIdCounter++;
  return clientIdCounter;
}

// function addUserToFile(newUser) {
//   try {

//     let data = [];
//     try {
//       const fileContent = fs.readFileSync('users.json', 'utf-8');
//       data = JSON.parse(fileContent);
//     } catch (readError) {
//     }
//     data.push(newUser);

    
//     fs.writeFileSync('users.json', JSON.stringify(data, null, 2), 'utf-8');

//     console.log('Имя пользователя сохранено в файле:', newUser);
//   } catch (error) {
//     console.error('Ошибка при сохранении имени пользователя в файле:', error);
//   }
// }


