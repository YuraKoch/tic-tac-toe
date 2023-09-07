const cellElements = document.querySelectorAll('.cell');
const messageElement = document.querySelector('.message');
let field = ["", "", "", "", "", "", "", "", "",];
let isGameActive = false;
let clientId = null;
let gameId = null;
let simbol = null;
let turn = null;

let ws = new WebSocket("ws://localhost:8080");

ws.onmessage = message => {
  const response = JSON.parse(message.data);

  if (response.method === "connect") {
    clientId = response.clientId;
  }

  if (response.method === "join") {
    gameId = response.game.gameId;
    simbol = response.game[clientId].simbol;
    turn = response.game[clientId].turn;

    if (simbol === turn) {
      isGameActive = true;
      messageElement.textContent = "move";
    } else {
      isGameActive = false;
      messageElement.textContent = `waiting ${turn}...`;
    }
  }

  if (response.method === "move") {
    field = response.field;
    turn = response.turn;
    updateField();

    if (simbol === turn) {
      isGameActive = true;
      messageElement.textContent = "move";
    } else {
      isGameActive = false;
      messageElement.textContent = `waiting ${turn}...`;
    }
  }

  if (response.method === "result") {
    field = response.field;
    updateField();
    isGameActive = false;
    setTimeout(() => {
      messageElement.textContent = response.message;
    }, 100);
  }

  if (response.method === "left") {
    isGameActive = false;
    messageElement.textContent = response.message;
  }
};

cellElements.forEach((cell) => cell.addEventListener('click', onCellClick));

function onCellClick(event) {
  makeMove(event.target);
}

function makeMove(cell) {
  if (!isGameActive || cell.dataset.simbol !== undefined) {
    return;
  }

  isGameActive = false;

  cell.dataset.simbol = simbol;
  cell.classList.add(simbol);

  cellElements.forEach((cell, index) => field[index] = cell.dataset.simbol || "");

  ws.send(JSON.stringify({
    "method": "click",
    "gameId": gameId,
    "simbol": simbol,
    "field": field,
  }));
}

function updateField() {
  cellElements.forEach((cell, index) => {
    cell.classList.remove("X", "O");
    if (field[index] === "") {
      delete cell.dataset.simbol;
    } else {
      cell.dataset.simbol = field[index];
      cell.classList.add(field[index]);
    }
  });
}
