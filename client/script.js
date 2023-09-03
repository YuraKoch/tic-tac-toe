const board = document.querySelector('.board');
const cells = document.querySelectorAll('.cell');
let currentPlayer = 'X';
let field = ["", "", "", "", "", "", "", "", "",];
let isGameActive = false;

let clientId = null;
let gameId = null;
let simbol = null;
let move = null;

let ws = new WebSocket("ws://localhost:8080");

ws.onmessage = message => {
  const response = JSON.parse(message.data);
  if (response.method === "connect") {
    clientId = response.clientId;
  }

  if (response.method === "join") {
    console.log(response);
    gameId = response.game.gameId;
    simbol = response.game[clientId].simbol;
    move = response.game[clientId].move;

    startGame();
  }

  if (response.method === "move") {
    console.log(response);
    field = response.field;
    move = response.move;

    if (simbol === move) {
      updateField();
      isGameActive = true;
    }
  }
};

function startGame() {
  isGameActive = move === simbol;
}

function stopGame() {
  isGameActive = false;;
}


cells.forEach((cell) => cell.addEventListener('click', onCellClick));

function onCellClick(event) {
  makeMove(event.target);
}

function makeMove(cell) {
  if (!isGameActive || cell.dataset.simbol !== undefined) {
    return;
  }

  stopGame();

  cell.dataset.simbol = simbol;
  cell.classList.add(simbol);

  cells.forEach((cell, index) => field[index] = cell.dataset.simbol || "");

  console.log({
    "method": "click",
    "gameId": gameId,
    "simbol": simbol,
    "field": field,
  });

  ws.send(JSON.stringify({
    "method": "click",
    "gameId": gameId,
    "simbol": simbol,
    "field": field,
  }));



  // if (checkWin()) {
  //   setTimeout(() => {
  //     alert(`${simbol} win!`);
  //   }, 100);
  //   isGameActive = false;
  //   return;
  // }

  // if (checkDraw()) {
  //   setTimeout(() => {
  //     alert('Draw!');
  //   }, 100);
  //   isGameActive = false;
  //   return;
  // }
}

function updateField() {
  cells.forEach((cell, index) => {
    cell.classList.remove("X", "O");
    if (field[index] === "") {
      delete cell.dataset.simbol;
    } else {
      cell.dataset.simbol = field[index];
      cell.classList.add(field[index]);
    }
  });
}

const winningCombos = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],  // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8],  // Columns
  [0, 4, 8], [2, 4, 6]              // Diagonals
];

function checkWin() {
  for (const combo of winningCombos) {
    const [first, second, third] = combo;
    if (cells[first].dataset.simbol &&
      cells[first].dataset.simbol === cells[second].dataset.simbol &&
      cells[first].dataset.simbol === cells[third].dataset.simbol) {
      isGameActive = false;
      return true;
    }
  }

  return false;
}

function checkDraw() {
  return [...cells].every(cell => cell.dataset.simbol !== undefined);
}