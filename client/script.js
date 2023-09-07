const cellElements = document.querySelectorAll('.cell');
const messageElement = document.querySelector('.message');
let field = ["", "", "", "", "", "", "", "", "",];
let isGameActive = false;
let simbol = null;
let turn = null;

let ws = new WebSocket("ws://localhost:8080");

ws.onmessage = message => {
  const response = JSON.parse(message.data);

  if (response.method === "join") {
    simbol = response.simbol;
    turn = response.turn;
    isGameActive = simbol === turn;
    updateMessage();
  }

  if (response.method === "update") {
    field = response.field;
    turn = response.turn;
    isGameActive = simbol === turn;
    updateBoard();
    updateMessage();
  }

  if (response.method === "result") {
    field = response.field;
    updateBoard();
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

cellElements.forEach((cell, index) => cell.addEventListener('click', (event) => {
  makeMove(event.target, index);
}));

function makeMove(cell, index) {
  if (!isGameActive || field[index] !== "") {
    return;
  }

  isGameActive = false;
  cell.classList.add(simbol);
  field[index] = simbol;

  ws.send(JSON.stringify({
    "method": "move",
    "simbol": simbol,
    "field": field,
  }));
}

function updateBoard() {
  cellElements.forEach((cell, index) => {
    cell.classList.remove("X", "O");
    field[index] !== "" && cell.classList.add(field[index]);
  });
}

function updateMessage() {
  if (simbol === turn) {
    messageElement.textContent = "move";
  } else {
    messageElement.textContent = `waiting ${turn}...`;
  }
}
