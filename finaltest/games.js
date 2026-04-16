// Mini Game Hub - Game Logic (Corrected)
// ============================================

// Audio System using Web Audio API
const AudioSystem = {
    ctx: null,
    
    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    },
    
    play(type) {
        if (!this.ctx) this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        
        const now = this.ctx.currentTime;
        
        switch(type) {
            case 'click':
            case 'tile':
                this.playTone(600, 'sine', 0.08, now, 0.1);
                break;
                
            case 'correct':
                this.playTone(523, 'sine', 0.12, now, 0.1);
                this.playTone(659, 'sine', 0.12, now + 0.1, 0.1);
                this.playTone(784, 'sine', 0.12, now + 0.2, 0.15);
                break;
                
            case 'wrong':
                this.playTone(200, 'square', 0.1, now, 0.15);
                this.playTone(150, 'square', 0.1, now + 0.1, 0.2);
                break;
                
            case 'win':
                const notes = [523, 659, 784, 1047];
                notes.forEach((freq, i) => {
                    this.playTone(freq, 'sine', 0.12, now + i * 0.12, 0.2);
                });
                break;
                
            case 'shuffle':
                for (let i = 0; i < 6; i++) {
                    const freq = 300 + Math.random() * 300;
                    this.playTone(freq, 'sine', 0.06, now + i * 0.04, 0.05);
                }
                break;
                
            case 'dotCorrect':
                this.playTone(880, 'sine', 0.15, now, 0.15);
                break;
                
            case 'dotWrong':
                this.playTone(150, 'sawtooth', 0.12, now, 0.2);
                break;
        }
    },
    
    playTone(freq, type, volume, startTime, duration) {
        const oscillator = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        
        oscillator.frequency.setValueAtTime(freq, startTime);
        oscillator.type = type;
        gainNode.gain.setValueAtTime(volume, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
    }
};

// State Management
const state = {
    playerName: '',
    currentScreen: 'entry',
    highScores: {
        tictactoe: 0,
        sliding: 0,
        quiz: 0
    }
};

// DOM Elements
const screens = {
    entry: document.getElementById('entry-screen'),
    home: document.getElementById('home-screen'),
    tictactoe: document.getElementById('tictactoe-screen'),
    sliding: document.getElementById('sliding-screen'),
    connect: document.getElementById('connect-screen'),
    quiz: document.getElementById('quiz-screen')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    AudioSystem.init();
    loadFromStorage();
    initializeEntryScreen();
    initializeHomeScreen();
    initializeTicTacToe();
    initializeSlidingPuzzle();
    initializeConnectDots();
    initializeQuiz();
});

// Storage Functions
function loadFromStorage() {
    const savedName = localStorage.getItem('gameHubPlayerName');
    const savedScores = localStorage.getItem('gameHubHighScores');
    
    if (savedName) state.playerName = savedName;
    if (savedScores) state.highScores = JSON.parse(savedScores);
    
    updateHighScoreDisplay();
}

function saveToStorage() {
    localStorage.setItem('gameHubPlayerName', state.playerName);
    localStorage.setItem('gameHubHighScores', JSON.stringify(state.highScores));
}

function updateHighScoreDisplay() {
    document.getElementById('hs-tictactoe').textContent = state.highScores.tictactoe;
    document.getElementById('hs-sliding').textContent = state.highScores.sliding;
    document.getElementById('hs-quiz').textContent = state.highScores.quiz;
}

// Screen Navigation
function switchScreen(screenName) {
    AudioSystem.play('click');
    
    Object.values(screens).forEach(screen => {
        screen.classList.remove('active');
    });
    
    setTimeout(() => {
        screens[screenName].classList.add('active');
        state.currentScreen = screenName;
        
        if (screenName === 'home') {
            document.getElementById('display-name').textContent = state.playerName || 'Player';
            updateHighScoreDisplay();
        }
        
        // Initialize Connect dots when entering that screen
        if (screenName === 'connect') {
            setTimeout(initConnectCanvas, 100);
        }
    }, 50);
}

// Entry Screen
function initializeEntryScreen() {
    const enterBtn = document.getElementById('enter-btn');
    const nameInput = document.getElementById('player-name');
    
    enterBtn.addEventListener('click', () => {
        const name = nameInput.value.trim();
        if (name) {
            AudioSystem.play('correct');
            state.playerName = name;
            saveToStorage();
            switchScreen('home');
        } else {
            AudioSystem.play('wrong');
            nameInput.style.borderColor = '#f87171';
            nameInput.classList.add('shake');
            setTimeout(() => {
                nameInput.style.borderColor = '';
                nameInput.classList.remove('shake');
            }, 500);
        }
    });
    
    nameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') enterBtn.click();
    });
}

// Home Screen
function initializeHomeScreen() {
    const gameCards = document.querySelectorAll('.game-card');
    
    gameCards.forEach(card => {
        card.addEventListener('click', () => {
            const game = card.dataset.game;
            switchScreen(game);
        });
    });
    
    document.getElementById('display-name').textContent = state.playerName || 'Player';
}

// ============================================
// TIC TAC TOE GAME
// ============================================
let tttState = {
    board: Array(9).fill(''),
    currentPlayer: 'X',
    gameOver: false,
    scores: { X: 0, O: 0, draws: 0 }
};

const winPatterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

function initializeTicTacToe() {
    const cells = document.querySelectorAll('.ttt-cell');
    const restartBtn = document.getElementById('ttt-restart');
    const backBtn = document.querySelector('#tictactoe-screen .btn-back');
    
    cells.forEach(cell => {
        cell.addEventListener('click', () => handleTTTClick(cell));
    });
    
    restartBtn.addEventListener('click', resetTTT);
    backBtn.addEventListener('click', () => switchScreen('home'));
    
    resetTTT();
}

function handleTTTClick(cell) {
    const index = parseInt(cell.dataset.index);
    
    if (tttState.board[index] || tttState.gameOver) return;
    
    AudioSystem.play('tile');
    tttState.board[index] = tttState.currentPlayer;
    cell.textContent = tttState.currentPlayer;
    cell.classList.add('taken');
    cell.classList.add(tttState.currentPlayer === 'X' ? 'x-mark' : 'o-mark');
    
    const winner = checkTTTWinner();
    if (winner) {
        tttState.gameOver = true;
        highlightWinningCells(winner.pattern);
        updateTTTScores(winner.player);
        showTTTMessage(`${winner.player} Wins!`, 'success');
        AudioSystem.play('win');
    } else if (tttState.board.every(cell => cell !== '')) {
        tttState.gameOver = true;
        updateTTTScores(null);
        showTTTMessage("It's a Draw!", 'draw');
        AudioSystem.play('wrong');
    } else {
        tttState.currentPlayer = tttState.currentPlayer === 'X' ? 'O' : 'X';
        updateTTTTurn();
    }
}

function checkTTTWinner() {
    for (const pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (tttState.board[a] && 
            tttState.board[a] === tttState.board[b] && 
            tttState.board[a] === tttState.board[c]) {
            return { player: tttState.board[a], pattern };
        }
    }
    return null;
}

function highlightWinningCells(pattern) {
    const cells = document.querySelectorAll('.ttt-cell');
    pattern.forEach(index => {
        cells[index].classList.add('winner');
    });
}

function updateTTTScores(winner) {
    if (winner) {
        tttState.scores[winner]++;
        if (tttState.scores[winner] > state.highScores.tictactoe) {
            state.highScores.tictactoe = tttState.scores[winner];
            saveToStorage();
        }
    } else {
        tttState.scores.draws++;
    }
    
    document.getElementById('ttt-x-score').textContent = tttState.scores.X;
    document.getElementById('ttt-o-score').textContent = tttState.scores.O;
    document.getElementById('ttt-draw-score').textContent = tttState.scores.draws;
}

function updateTTTTurn() {
    const turnIndicator = document.getElementById('ttt-turn');
    const currentMark = turnIndicator.querySelector('.current-mark');
    currentMark.textContent = tttState.currentPlayer;
    currentMark.className = `current-mark ${tttState.currentPlayer === 'X' ? 'x-mark' : 'o-mark'}`;
}

function showTTTMessage(message, type) {
    const msgEl = document.getElementById('ttt-win-message');
    msgEl.textContent = message;
    msgEl.className = `win-message show ${type}`;
}

function resetTTT() {
    tttState.board = Array(9).fill('');
    tttState.currentPlayer = 'X';
    tttState.gameOver = false;
    
    const cells = document.querySelectorAll('.ttt-cell');
    cells.forEach(cell => {
        cell.textContent = '';
        cell.classList.remove('taken', 'x-mark', 'o-mark', 'winner');
    });
    
    const msgEl = document.getElementById('ttt-win-message');
    msgEl.classList.remove('show');
    
    updateTTTTurn();
}

// ============================================
// SLIDING PUZZLE GAME
// ============================================
let slidingState = {
    tiles: [1, 2, 3, 4, 5, 6, 7, 8, 0],
    moves: 0,
    bestScore: 0
};

function initializeSlidingPuzzle() {
    const shuffleBtn = document.getElementById('sliding-shuffle');
    const resetBtn = document.getElementById('sliding-restart');
    const backBtn = document.querySelector('#sliding-screen .btn-back');
    
    shuffleBtn.addEventListener('click', () => {
        AudioSystem.play('shuffle');
        shuffleSliding();
    });
    resetBtn.addEventListener('click', () => {
        AudioSystem.play('click');
        resetSliding();
    });
    backBtn.addEventListener('click', () => switchScreen('home'));
    
    slidingState.bestScore = state.highScores.sliding || 0;
    
    renderSlidingBoard();
    shuffleSliding();
}

function renderSlidingBoard() {
    const board = document.getElementById('sliding-board');
    board.innerHTML = '';
    
    slidingState.tiles.forEach((tile, index) => {
        const tileEl = document.createElement('div');
        tileEl.className = `sliding-tile ${tile === 0 ? 'empty' : ''}`;
        tileEl.textContent = tile === 0 ? '' : tile;
        tileEl.dataset.index = index;
        
        if (tile !== 0) {
            tileEl.addEventListener('click', () => handleSlidingClick(index));
        }
        
        board.appendChild(tileEl);
    });
    
    document.getElementById('sliding-moves').textContent = slidingState.moves;
    document.getElementById('sliding-best').textContent = 
        slidingState.bestScore > 0 ? slidingState.bestScore : '-';
}

function handleSlidingClick(index) {
    const emptyIndex = slidingState.tiles.indexOf(0);
    
    if (isAdjacent(index, emptyIndex)) {
        AudioSystem.play('tile');
        [slidingState.tiles[index], slidingState.tiles[emptyIndex]] = 
        [slidingState.tiles[emptyIndex], slidingState.tiles[index]];
        
        slidingState.moves++;
        renderSlidingBoard();
        
        const tiles = document.querySelectorAll('.sliding-tile');
        tiles[emptyIndex].classList.add('moving');
        setTimeout(() => tiles[emptyIndex].classList.remove('moving'), 200);
        
        if (checkSlidingWin()) {
            handleSlidingWin();
        }
    }
}

function isAdjacent(index1, index2) {
    const row1 = Math.floor(index1 / 3);
    const col1 = index1 % 3;
    const row2 = Math.floor(index2 / 3);
    const col2 = index2 % 3;
    
    return (Math.abs(row1 - row2) === 1 && col1 === col2) ||
           (Math.abs(col1 - col2) === 1 && row1 === row2);
}

function shuffleSliding() {
    do {
        for (let i = slidingState.tiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [slidingState.tiles[i], slidingState.tiles[j]] = 
            [slidingState.tiles[j], slidingState.tiles[i]];
        }
    } while (!isSolvable() || checkSlidingWin());
    
    slidingState.moves = 0;
    renderSlidingBoard();
    
    const msgEl = document.getElementById('sliding-win-message');
    msgEl.classList.remove('show');
}

function isSolvable() {
    let inversions = 0;
    const tiles = slidingState.tiles.filter(t => t !== 0);
    
    for (let i = 0; i < tiles.length; i++) {
        for (let j = i + 1; j < tiles.length; j++) {
            if (tiles[i] > tiles[j]) inversions++;
        }
    }
    
    return inversions % 2 === 0;
}

function checkSlidingWin() {
    const winState = [1, 2, 3, 4, 5, 6, 7, 8, 0];
    return slidingState.tiles.every((tile, index) => tile === winState[index]);
}

function handleSlidingWin() {
    AudioSystem.play('win');
    if (slidingState.moves < slidingState.bestScore || slidingState.bestScore === 0) {
        slidingState.bestScore = slidingState.moves;
        state.highScores.sliding = slidingState.moves;
        saveToStorage();
    }
    
    showSlidingMessage(`Solved in ${slidingState.moves} moves!`, 'success');
}

function resetSliding() {
    slidingState.tiles = [1, 2, 3, 4, 5, 6, 7, 8, 0];
    slidingState.moves = 0;
    shuffleSliding();
}

function showSlidingMessage(message, type) {
    const msgEl = document.getElementById('sliding-win-message');
    msgEl.textContent = message;
    msgEl.className = `win-message show ${type}`;
}

// ============================================
// CONNECT THE DOTS GAME (FIXED)
// ============================================

// Shape definitions with clearly separated dots
const SHAPES = {
    square: {
        name: 'Square',
        icon: '⬜',
        dots: [
            { x: 80, y: 80 },   // 0: top-left
            { x: 320, y: 80 },  // 1: top-right
            { x: 320, y: 320 }, // 2: bottom-right
            { x: 80, y: 320 }   // 3: bottom-left
        ],
        path: [0, 1, 2, 3, 0]
    },
    triangle: {
        name: 'Triangle',
        icon: '🔺',
        dots: [
            { x: 200, y: 60 },   // 0: top
            { x: 340, y: 320 },  // 1: bottom-right
            { x: 60, y: 320 }    // 2: bottom-left
        ],
        path: [0, 1, 2, 0]
    },
    house: {
        name: 'House',
        icon: '🏠',
        dots: [
            { x: 60, y: 200 },   // 0: left wall
            { x: 60, y: 340 },  // 1: left bottom
            { x: 340, y: 340 }, // 2: right bottom
            { x: 340, y: 200 }, // 3: right wall
            { x: 200, y: 60 }   // 4: roof peak
        ],
        path: [0, 1, 2, 3, 4, 0]
    },
    star: {
        name: 'Star',
        icon: '⭐',
        dots: [
            { x: 200, y: 40 },   // 0: top point
            { x: 120, y: 160 },  // 1: upper-left inner
            { x: 40, y: 160 },   // 2: left point
            { x: 160, y: 220 },  // 3: lower-left inner
            { x: 120, y: 360 },  // 4: bottom-left point
            { x: 200, y: 280 },  // 5: bottom inner
            { x: 280, y: 360 }, // 6: bottom-right point
            { x: 240, y: 220 }, // 7: lower-right inner
            { x: 360, y: 160 }, // 8: right point
            { x: 280, y: 160 }  // 9: upper-right inner
        ],
        path: [0, 2, 4, 6, 8, 9, 7, 5, 3, 1, 0]
    },
    arrow: {
        name: 'Arrow',
        icon: '➡️',
        dots: [
            { x: 60, y: 160 },   // 0: left
            { x: 200, y: 60 },   // 1: top
            { x: 340, y: 160 },  // 2: right
            { x: 260, y: 160 },  // 3: right indent top
            { x: 260, y: 260 },  // 4: right indent bottom
            { x: 340, y: 260 },  // 5: far right bottom
            { x: 200, y: 360 },  // 6: bottom point
            { x: 60, y: 260 }    // 7: left bottom
        ],
        path: [0, 1, 2, 3, 4, 5, 6, 7, 0]
    }
};

let connectState = {
    dots: [],
    currentPath: [],
    correctPath: [],
    isComplete: false,
    currentShape: null,
    animationFrame: null,
    canvasReady: false
};

function initializeConnectDots() {
    const resetBtn = document.getElementById('connect-reset');
    const backBtn = document.querySelector('#connect-screen .btn-back');
    const wrapper = document.querySelector('.connect-canvas-wrapper');
    
    resetBtn.addEventListener('click', () => {
        AudioSystem.play('shuffle');
        generateNewShape();
    });
    backBtn.addEventListener('click', () => switchScreen('home'));
    
    // Use wrapper for click events since canvas might have issues
    wrapper.addEventListener('click', handleWrapperClick);
    wrapper.addEventListener('touchstart', handleWrapperTouch, { passive: false });
}

function initConnectCanvas() {
    const canvas = document.getElementById('connect-canvas');
    
    // Set fixed internal resolution
    canvas.width = 400;
    canvas.height = 400;
    
    connectState.canvasReady = true;
    generateNewShape();
}

function generateNewShape() {
    // Cancel any existing animation
    if (connectState.animationFrame) {
        cancelAnimationFrame(connectState.animationFrame);
    }
    
    // Pick random shape
    const shapeNames = Object.keys(SHAPES);
    const shapeName = shapeNames[Math.floor(Math.random() * shapeNames.length)];
    const shape = SHAPES[shapeName];
    
    connectState.dots = [...shape.dots];
    connectState.correctPath = [...shape.path];
    connectState.currentPath = [];
    connectState.isComplete = false;
    connectState.currentShape = shapeName;
    
    // Update UI
    document.getElementById('shape-hint').textContent = shape.icon + ' ' + shape.name;
    document.getElementById('connect-title').textContent = 'Connect the Dots';
    
    const msgEl = document.getElementById('connect-win-message');
    msgEl.classList.remove('show');
    
    updateConnectProgress();
    startDrawing();
}

function startDrawing() {
    const render = () => {
        drawConnectDots();
        if (!connectState.isComplete) {
            connectState.animationFrame = requestAnimationFrame(render);
        }
    };
    render();
}

function drawConnectDots() {
    const canvas = document.getElementById('connect-canvas');
    if (!canvas || !connectState.dots.length) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 400, 400);
    
    // Draw hint line (ghost of full shape) - subtle
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.1)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    
    const hintFirst = connectState.dots[connectState.correctPath[0]];
    ctx.moveTo(hintFirst.x, hintFirst.y);
    for (let i = 1; i < connectState.correctPath.length; i++) {
        const dot = connectState.dots[connectState.correctPath[i]];
        ctx.lineTo(dot.x, dot.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw completed path
    if (connectState.currentPath.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = connectState.isComplete ? '#4ade80' : '#22d3ee';
        ctx.lineWidth = connectState.isComplete ? 6 : 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = connectState.isComplete ? '#4ade80' : '#22d3ee';
        ctx.shadowBlur = connectState.isComplete ? 30 : 15;
        
        const firstDot = connectState.dots[connectState.currentPath[0]];
        ctx.moveTo(firstDot.x, firstDot.y);
        for (let i = 1; i < connectState.currentPath.length; i++) {
            const dot = connectState.dots[connectState.currentPath[i]];
            ctx.lineTo(dot.x, dot.y);
        }
        ctx.stroke();
    }
    
    // Draw dots
    const time = Date.now() / 1000;
    const nextDotIndex = connectState.currentPath.length < connectState.correctPath.length 
        ? connectState.correctPath[connectState.currentPath.length] 
        : -1;
    
    connectState.dots.forEach((dot, index) => {
        const isInPath = connectState.currentPath.includes(index);
        const isNext = index === nextDotIndex && !connectState.isComplete;
        const isFirst = index === 0 && connectState.currentPath.length === 0;
        
        // Outer glow for next dot
        if (isNext || isFirst) {
            const pulse = Math.sin(time * 5) * 0.15 + 0.25;
            ctx.beginPath();
            ctx.arc(dot.x, dot.y, 35, 0, Math.PI * 2);
            ctx.fillStyle = isNext ? `rgba(74, 222, 128, ${pulse})` : `rgba(74, 222, 128, 0.3)`;
            ctx.fill();
        }
        
        // Main dot
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, 25, 0, Math.PI * 2);
        
        if (isInPath) {
            ctx.fillStyle = '#22d3ee';
            ctx.shadowColor = '#22d3ee';
            ctx.shadowBlur = 15;
        } else if (isNext) {
            const pulse = Math.sin(time * 5) * 3 + 25;
            ctx.arc(dot.x, dot.y, pulse, 0, Math.PI * 2);
            ctx.fillStyle = '#4ade80';
            ctx.shadowColor = '#4ade80';
            ctx.shadowBlur = 25;
        } else {
            ctx.arc(dot.x, dot.y, 25, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(139, 92, 246, 0.9)';
            ctx.shadowColor = 'rgba(139, 92, 246, 0.5)';
            ctx.shadowBlur = 10;
        }
        ctx.fill();
        
        // White border
        ctx.strokeStyle = isInPath ? '#4ade80' : '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Number label
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#000';
        ctx.font = 'bold 16px Poppins, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(index + 1, dot.x, dot.y);
    });
}

function handleWrapperClick(event) {
    if (connectState.isComplete) return;
    
    const canvas = document.getElementById('connect-canvas');
    const rect = canvas.getBoundingClientRect();
    
    // Get click position relative to canvas
    const clickX = (event.clientX - rect.left) * (400 / rect.width);
    const clickY = (event.clientY - rect.top) * (400 / rect.height);
    
    checkDotHit(clickX, clickY);
}

function handleWrapperTouch(event) {
    event.preventDefault();
    if (connectState.isComplete) return;
    
    const canvas = document.getElementById('connect-canvas');
    const rect = canvas.getBoundingClientRect();
    const touch = event.touches[0];
    
    const touchX = (touch.clientX - rect.left) * (400 / rect.width);
    const touchY = (touch.clientY - rect.top) * (400 / rect.height);
    
    checkDotHit(touchX, touchY);
}

function checkDotHit(clickX, clickY) {
    const hitRadius = 35; // Generous hit area
    
    for (let i = 0; i < connectState.dots.length; i++) {
        const dot = connectState.dots[i];
        const distance = Math.sqrt((dot.x - clickX) ** 2 + (dot.y - clickY) ** 2);
        
        if (distance <= hitRadius) {
            // A dot was clicked
            const expectedDotIndex = connectState.correctPath[connectState.currentPath.length];
            
            if (i === expectedDotIndex) {
                // Correct!
                AudioSystem.play('dotCorrect');
                connectState.currentPath.push(i);
                
                // Check for completion
                if (connectState.currentPath.length === connectState.correctPath.length) {
                    connectState.isComplete = true;
                    AudioSystem.play('win');
                    const shape = SHAPES[connectState.currentShape];
                    showConnectMessage(`${shape.icon} ${shape.name} Complete!`, 'success');
                }
            } else {
                // Wrong dot
                AudioSystem.play('dotWrong');
                
                // Shake animation
                const wrapper = document.querySelector('.connect-canvas-wrapper');
                wrapper.classList.add('shake');
                setTimeout(() => wrapper.classList.remove('shake'), 400);
                
                // Reset progress (lose last 2 dots)
                if (connectState.currentPath.length > 0) {
                    const resetCount = Math.min(2, connectState.currentPath.length);
                    for (let r = 0; r < resetCount; r++) {
                        connectState.currentPath.pop();
                    }
                }
            }
            return; // Only process one dot click at a time
        }
    }
    // No dot was hit - do nothing
}

function updateConnectProgress() {
    const total = connectState.correctPath.length;
    const current = connectState.currentPath.length;
    const percentage = total > 0 ? (current / total) * 100 : 0;
    
    document.getElementById('connect-progress-text').textContent = 
        `${current} / ${total} dots connected`;
    document.getElementById('connect-progress-fill').style.width = `${percentage}%`;
}

function showConnectMessage(message, type) {
    const msgEl = document.getElementById('connect-win-message');
    msgEl.textContent = message;
    msgEl.className = `win-message show ${type}`;
}

// ============================================
// BRAIN QUIZ GAME (FIXED)
// ============================================
const quizQuestionBank = [
    // Pattern/Sequence
    {
        question: "What number comes next?",
        visual: "2, 4, 8, 16, ?",
        options: ["24", "32", "30", "20"],
        correct: 1
    },
    {
        question: "What comes next in the pattern?",
        visual: "1, 1, 2, 3, 5, 8, ?",
        options: ["11", "12", "13", "15"],
        correct: 2
    },
    {
        question: "Complete the sequence: 3, 6, 11, 18, ?",
        visual: "",
        options: ["25", "27", "29", "31"],
        correct: 1
    },
    {
        question: "What number should replace ?",
        visual: "5, 10, 20, 35, 55, ?",
        options: ["70", "75", "80", "85"],
        correct: 2
    },
    // Odd one out
    {
        question: "Which one is different?",
        visual: "🔴 🔴 🔵 🔴 🔴",
        options: ["1st", "2nd", "3rd", "5th"],
        correct: 2
    },
    {
        question: "Find the odd one out:",
        visual: "🍎 🍎 🍊 🍎 🍎",
        options: ["1st", "2nd", "3rd", "4th"],
        correct: 2
    },
    {
        question: "Which doesn't belong?",
        visual: "🐕 🐕 🐈 🐕 🐕",
        options: ["1st", "2nd", "3rd", "5th"],
        correct: 2
    },
    // Counting
    {
        question: "Count the circles:",
        visual: "⭕ ⭕ 🔺 ⭕ 🔲 ⭕",
        options: ["2", "3", "4", "5"],
        correct: 1
    },
    {
        question: "How many triangles?",
        visual: "🔺 🔺 ⭕ 🔺 🔺 🔺",
        options: ["2", "3", "4", "5"],
        correct: 2
    },
    {
        question: "Count the squares:",
        visual: "⬜ ⬜ 🔺 ⬜ ⬜",
        options: ["2", "3", "4", "5"],
        correct: 2
    },
    // Alternating patterns
    {
        question: "What comes next?",
        visual: "⬛ ⬜ ⬛ ⬜ ⬛ ?",
        options: ["⬛", "⬜", "🔲", "❓"],
        correct: 0
    },
    {
        question: "Continue the pattern:",
        visual: "🔴 🔵 🔴 🔵 ?",
        options: ["🔴", "🔵", "🟡", "🟢"],
        correct: 0
    },
    {
        question: "What should come next?",
        visual: "1️⃣ 2️⃣ 1️⃣ 2️⃣ 1️⃣ ?",
        options: ["1️⃣", "2️⃣", "3️⃣", "🔄"],
        correct: 1
    },
    // Logic
    {
        question: "If all Cats are Dogs, and all Dogs are Animals, then all Cats are definitely...?",
        visual: "",
        options: ["Dogs", "Animals", "Cats", "Can't say"],
        correct: 1
    },
    {
        question: "A is taller than B. B is taller than C. Who is the shortest?",
        visual: "",
        options: ["A", "B", "C", "Can't tell"],
        correct: 2
    },
    {
        question: "If you rearrange 'CIFAIPC' you'll get the name of a...?",
        visual: "",
        options: ["City", "Animal", "Country", "Food"],
        correct: 2
    },
    {
        question: "Which word does NOT belong?",
        visual: "Apple Banana Orange Carrot",
        options: ["Apple", "Banana", "Carrot", "Orange"],
        correct: 2
    },
    // Math
    {
        question: "If a clock shows 3:15, what is the angle between the hands?",
        visual: "🕐",
        options: ["0°", "7.5°", "15°", "22.5°"],
        correct: 1
    },
    {
        question: "What is 50% of 25% of 400?",
        visual: "",
        options: ["25", "50", "75", "100"],
        correct: 1
    },
    {
        question: "If you have 3 apples and take away 2, how many do you have?",
        visual: "🍎 🍎 🍎",
        options: ["1", "2", "3", "0"],
        correct: 2
    }
];

let quizState = {
    currentQuestion: 0,
    score: 0,
    answered: false,
    selectedQuestions: [],
    currentCorrectIndex: -1 // Track the actual correct option index
};

function initializeQuiz() {
    const retryBtn = document.getElementById('quiz-retry');
    const backBtn = document.querySelector('#quiz-screen .btn-back');
    
    retryBtn.addEventListener('click', () => {
        AudioSystem.play('click');
        startQuiz();
    });
    backBtn.addEventListener('click', () => switchScreen('home'));
    
    startQuiz();
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function startQuiz() {
    // Select 5 random questions from the bank
    quizState.selectedQuestions = shuffleArray(quizQuestionBank).slice(0, 5);
    quizState.currentQuestion = 0;
    quizState.score = 0;
    quizState.answered = false;
    
    document.getElementById('quiz-result').classList.remove('show');
    document.getElementById('quiz-question-container').classList.remove('hidden');
    document.getElementById('quiz-score').textContent = '0';
    
    showQuestion();
}

function showQuestion() {
    const q = quizState.selectedQuestions[quizState.currentQuestion];
    
    document.getElementById('quiz-question-number').textContent = 
        `Question ${quizState.currentQuestion + 1}/${quizState.selectedQuestions.length}`;
    document.getElementById('quiz-question').textContent = q.question;
    document.getElementById('quiz-visual').textContent = q.visual;
    
    // Update progress bar
    const progress = (quizState.currentQuestion / quizState.selectedQuestions.length) * 100;
    document.getElementById('quiz-progress-fill').style.width = `${progress}%`;
    
    // Create options - shuffle them
    const optionsContainer = document.getElementById('quiz-options');
    optionsContainer.innerHTML = '';
    
    // Create array of indices and shuffle
    const indices = q.options.map((_, i) => i);
    const shuffledIndices = shuffleArray(indices);
    
    // Find which shuffled position has the correct answer
    quizState.currentCorrectIndex = shuffledIndices.indexOf(q.correct);
    
    shuffledIndices.forEach((originalIndex, displayPos) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-option';
        btn.innerHTML = `${q.options[originalIndex]}<span class="option-icon"></span>`;
        // Store whether THIS button is the correct one
        btn.dataset.correct = (originalIndex === q.correct) ? 'true' : 'false';
        btn.addEventListener('click', () => handleQuizAnswer(btn));
        optionsContainer.appendChild(btn);
    });
    
    quizState.answered = false;
}

function handleQuizAnswer(selectedBtn) {
    if (quizState.answered) return;
    quizState.answered = true;
    
    const options = document.querySelectorAll('.quiz-option');
    const isCorrect = selectedBtn.dataset.correct === 'true';
    
    if (isCorrect) {
        AudioSystem.play('correct');
        selectedBtn.classList.add('correct');
        selectedBtn.querySelector('.option-icon').textContent = '✓';
        quizState.score++;
        document.getElementById('quiz-score').textContent = quizState.score;
    } else {
        AudioSystem.play('wrong');
        selectedBtn.classList.add('wrong');
        selectedBtn.querySelector('.option-icon').textContent = '✗';
        
        // Find and highlight the correct answer
        options.forEach(opt => {
            if (opt.dataset.correct === 'true') {
                opt.classList.add('correct');
                opt.querySelector('.option-icon').textContent = '✓';
            }
        });
    }
    
    // Disable all options
    options.forEach(opt => opt.classList.add('disabled'));
    
    setTimeout(() => {
        quizState.currentQuestion++;
        
        if (quizState.currentQuestion < quizState.selectedQuestions.length) {
            showQuestion();
        } else {
            showQuizResults();
        }
    }, 1200);
}

function showQuizResults() {
    document.getElementById('quiz-progress-fill').style.width = '100%';
    
    document.getElementById('quiz-question-container').classList.add('hidden');
    const resultContainer = document.getElementById('quiz-result');
    resultContainer.classList.add('show');
    
    document.getElementById('quiz-final-score').textContent = quizState.score;
    document.getElementById('quiz-score-text').textContent = 
        `out of ${quizState.selectedQuestions.length}`;
    
    let feedback = '';
    const perfect = quizState.score === quizState.selectedQuestions.length;
    const ratio = quizState.score / quizState.selectedQuestions.length;
    
    if (perfect) {
        feedback = '🏆 Perfect Score! You\'re a genius!';
        AudioSystem.play('win');
    } else if (ratio >= 0.8) {
        feedback = '🌟 Excellent work!';
        AudioSystem.play('correct');
    } else if (ratio >= 0.6) {
        feedback = '👍 Good job! Keep practicing!';
    } else if (ratio >= 0.4) {
        feedback = '🤔 Not bad, try again!';
    } else {
        feedback = '💪 You can do better!';
    }
    
    document.getElementById('quiz-feedback').textContent = feedback;
    
    if (quizState.score > state.highScores.quiz) {
        state.highScores.quiz = quizState.score;
        saveToStorage();
    }
}
