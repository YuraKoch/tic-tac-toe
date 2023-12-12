const cellElements = document.querySelectorAll('.cell');
const messageElement = document.querySelector('.message');
const startGameButton = document.getElementById('startGameButton');
const playerNameInput = document.getElementById('playerNameInput');

let field = ["", "", "", "", "", "", "", "", ""];
let isGameActive = false;
let symbol = null;
let turn = null;

let ws = new WebSocket("ws://localhost:3000");

ws.onmessage = message => {
  const response = JSON.parse(message.data);

  if (response.method === "join") {
    symbol = response.symbol;
    turn = response.turn;
    isGameActive = symbol === turn;
    updateMessage();
  }

  if (response.method === "update") {
    field = response.field;
    turn = response.turn;
    isGameActive = symbol === turn;
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

startGameButton.addEventListener('click', () => {
  const playerName = playerNameInput.value.trim();
  if (playerName !== "") {
    
    ws.send(JSON.stringify({
      "method": "setName",
      "playerName": playerName
    }));
   
    playerNameInput.style.display = "none";
    startGameButton.style.display = "none";
    document.querySelector('.board').style.display = "block";
  } else {
    alert("Please enter your name.");
  }
})

function makeMove(cell, index) {
  if (!isGameActive || field[index] !== "") {
    return;
  }

  isGameActive = false;
  cell.classList.add(symbol);
  field[index] = symbol;

  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      method: "move",
      symbol: symbol,
      field: field,
    }));
  }
}

function updateBoard() {
  cellElements.forEach((cell, index) => {
    cell.classList.remove("X", "O");
    field[index] !== "" && cell.classList.add(field[index]);
  });
}

function updateMessage() {
  if (symbol === turn) {
    messageElement.textContent = "move";
  } else {
    messageElement.textContent = `waiting ${turn}...`;
  }
}
