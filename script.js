const canvas = document.getElementById("game-canvas");
const context = canvas.getContext("2d");
const startButton = document.getElementById("start-button");
const touchButtons = document.querySelectorAll("[data-direction]");
const scoreElement = document.getElementById("score");
const bestScoreElement = document.getElementById("best-score");
const statusElement = document.getElementById("status");

const bestScoreStorageKey = "snake-best-score";

const touchDirectionVectors = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const gridSize = 20;
const tileCount = canvas.width / gridSize;
const moveInterval = 140;
const maxQueuedDirections = 3;

const directionVectors = {
  ArrowUp: { x: 0, y: -1 },
  KeyW: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  KeyS: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  KeyA: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  KeyD: { x: 1, y: 0 },
};

const initialDirection = { x: 1, y: 0 };
let timerId = null;

const gameState = {
  snake: [],
  food: { x: 0, y: 0 },
  direction: { ...initialDirection },
  nextDirection: { ...initialDirection },
  pendingDirections: [],
  score: 0,
  bestScore: getBestScore(),
  isRunning: false,
  isGameOver: false,
};

function getBestScore() {
  const value = window.localStorage.getItem(bestScoreStorageKey);
  const parsedValue = Number.parseInt(value ?? "0", 10);

  if (Number.isNaN(parsedValue) || parsedValue < 0) {
    return 0;
  }

  return parsedValue;
}

function saveBestScore() {
  window.localStorage.setItem(
    bestScoreStorageKey,
    String(gameState.bestScore),
  );
}

function updateBestScore() {
  bestScoreElement.textContent = String(gameState.bestScore);
}

function updateStoredBestScore() {
  if (gameState.score <= gameState.bestScore) {
    return;
  }

  gameState.bestScore = gameState.score;
  saveBestScore();
  updateBestScore();
}

function resetGame() {
  gameState.snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ];
  gameState.direction = { ...initialDirection };
  gameState.nextDirection = { ...initialDirection };
  gameState.pendingDirections = [];
  gameState.score = 0;
  gameState.isGameOver = false;
  gameState.food = createFood();
  updateScore();
  updateBestScore();
  updateStatus("待开始");
  startButton.textContent = "开始游戏";
  draw();
}

function createFood() {
  while (true) {
    const candidate = {
      x: Math.floor(Math.random() * tileCount),
      y: Math.floor(Math.random() * tileCount),
    };

    const isOnSnake = gameState.snake.some(
      (segment) => segment.x === candidate.x && segment.y === candidate.y,
    );

    if (!isOnSnake) {
      return candidate;
    }
  }
}

function updateScore() {
  scoreElement.textContent = String(gameState.score);
}

function updateStatus(text) {
  statusElement.textContent = text;
}

function startGame() {
  if (timerId !== null) {
    clearInterval(timerId);
  }

  if (gameState.isGameOver || !gameState.isRunning) {
    gameState.isGameOver = false;
    gameState.isRunning = true;
    gameState.direction = { ...initialDirection };
    gameState.nextDirection = { ...initialDirection };
  }

  updateStatus("进行中");
  startButton.textContent = "重新开始";
  timerId = setInterval(gameLoop, moveInterval);
}

function restartGame() {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }

  gameState.isRunning = false;
  resetGame();
  startGame();
}

function gameLoop() {
  if (!gameState.isRunning || gameState.isGameOver) {
    return;
  }

  applyQueuedDirection();

  const nextHead = {
    x: wrapPosition(gameState.snake[0].x + gameState.direction.x),
    y: wrapPosition(gameState.snake[0].y + gameState.direction.y),
  };
  const isEating =
    nextHead.x === gameState.food.x && nextHead.y === gameState.food.y;
  const collisionBody = isEating
    ? gameState.snake
    : gameState.snake.slice(0, gameState.snake.length - 1);

  if (isSelfCollision(nextHead, collisionBody)) {
    endGame();
    return;
  }

  gameState.snake.unshift(nextHead);

  if (isEating) {
    gameState.score += 1;
    gameState.food = createFood();
    updateScore();
    updateStoredBestScore();
  } else {
    gameState.snake.pop();
  }

  draw();
}

function wrapPosition(value) {
  if (value < 0) {
    return tileCount - 1;
  }

  if (value >= tileCount) {
    return 0;
  }

  return value;
}

function isSelfCollision(position, segments = gameState.snake) {
  return segments.some(
    (segment) => segment.x === position.x && segment.y === position.y,
  );
}

function endGame() {
  gameState.isGameOver = true;
  gameState.isRunning = false;

  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }

  updateStatus("游戏结束");
  startButton.textContent = "重新开始";
  draw();
  drawOverlay("游戏结束", "点击“重新开始”再来一局");
}

function draw() {
  drawBackground();
  drawFood();
  drawSnake();
}

function drawBackground() {
  context.fillStyle = "#0d1117";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = "rgba(255, 255, 255, 0.05)";
  context.lineWidth = 1;

  for (let index = 0; index <= tileCount; index += 1) {
    const offset = index * gridSize;

    context.beginPath();
    context.moveTo(offset, 0);
    context.lineTo(offset, canvas.height);
    context.stroke();

    context.beginPath();
    context.moveTo(0, offset);
    context.lineTo(canvas.width, offset);
    context.stroke();
  }
}

function drawSnake() {
  gameState.snake.forEach((segment, index) => {
    context.fillStyle = index === 0 ? "#7dff91" : "#31c85b";
    context.fillRect(
      segment.x * gridSize + 1,
      segment.y * gridSize + 1,
      gridSize - 2,
      gridSize - 2,
    );
  });
}

function drawFood() {
  context.fillStyle = "#ff6b6b";
  context.beginPath();
  context.arc(
    gameState.food.x * gridSize + gridSize / 2,
    gameState.food.y * gridSize + gridSize / 2,
    gridSize / 2.8,
    0,
    Math.PI * 2,
  );
  context.fill();
}

function drawOverlay(title, subtitle) {
  context.fillStyle = "rgba(0, 0, 0, 0.58)";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "#ffffff";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "bold 30px Segoe UI";
  context.fillText(title, canvas.width / 2, canvas.height / 2 - 16);
  context.font = "16px Segoe UI";
  context.fillStyle = "#d7dfeb";
  context.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 20);
}

function isOppositeDirection(firstDirection, secondDirection) {
  return (
    firstDirection.x === -secondDirection.x &&
    firstDirection.y === -secondDirection.y
  );
}

function applyQueuedDirection() {
  if (gameState.pendingDirections.length === 0) {
    gameState.direction = { ...gameState.nextDirection };
    return;
  }

  gameState.direction = gameState.pendingDirections.shift();
  gameState.nextDirection =
    gameState.pendingDirections.at(-1) ?? { ...gameState.direction };
}

function queueDirection(nextVector) {
  const queuedDirections = gameState.pendingDirections;
  const lastDirection = queuedDirections.at(-1) ?? gameState.nextDirection;

  if (
    (lastDirection.x === nextVector.x && lastDirection.y === nextVector.y) ||
    isOppositeDirection(lastDirection, nextVector) ||
    queuedDirections.length >= maxQueuedDirections
  ) {
    return;
  }

  queuedDirections.push({ ...nextVector });
  gameState.nextDirection = { ...queuedDirections.at(-1) };
}

function applyDirection(nextVector) {
  if (isOppositeDirection(gameState.direction, nextVector)) {
    return;
  }

  queueDirection(nextVector);
}

function handleDirectionChange(event) {
  const nextVector = directionVectors[event.code];

  if (!nextVector) {
    return;
  }

  event.preventDefault();
  applyDirection(nextVector);
}

function handleTouchDirection(event) {
  const direction = event.currentTarget.dataset.direction;
  const nextVector = touchDirectionVectors[direction];

  if (!nextVector) {
    return;
  }

  event.preventDefault();
  applyDirection(nextVector);
}

startButton.addEventListener("click", () => {
  if (gameState.isRunning) {
    restartGame();
    return;
  }

  if (gameState.isGameOver) {
    restartGame();
    return;
  }

  startGame();
});

document.addEventListener("keydown", handleDirectionChange);
touchButtons.forEach((button) => {
  button.addEventListener("click", handleTouchDirection);
});

resetGame();
drawOverlay("准备开始", "点击“开始游戏”进入游戏");
