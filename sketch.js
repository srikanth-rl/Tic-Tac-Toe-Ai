/* ============================================
   GAME STATE
   ============================================ */
let board = [['', '', ''], ['', '', ''], ['', '', '']];
let w, h;
let ai = 'X';
let human = 'O';
let currentPlayer = human;
let winningCombo = null;

/* ============================================
   SETTINGS & PERSISTENCE
   ============================================ */
let difficulty = 'medium';    // easy | medium | hard
let aiGoesFirst = true;
let soundEnabled = true;

/* ============================================
   SCORE & STATS
   ============================================ */
let scoreAI = 0, scoreTie = 0, scoreYou = 0;
let streakAI = 0, streakYou = 0;
let bestStreakYou = 0, bestStreakAI = 0;
let totalGames = 0;

/* ============================================
   ANIMATION STATE
   ============================================ */
let cellPlacedTime = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
let cellAnimating = [[false, false, false], [false, false, false], [false, false, false]];
let hoveredI = -1, hoveredJ = -1;
let winLineProgress = 0;
let gameEnded = false;
let isResetting = false;
const CANVAS_SIZE = 400;

/* ============================================
   MOVE HISTORY (for undo)
   ============================================ */
let moveHistory = [];  // [{i, j, player}, ...]

/* ============================================
   GAME TIMER
   ============================================ */
let gameStartTime = 0;
let gameTimerInterval = null;

/* ============================================
   COLOR PALETTE
   ============================================ */
const COLORS = {
    bg: [15, 23, 42],
    grid: [51, 65, 85],
    gridGlow: [100, 116, 139],
    x: [244, 63, 94],
    xGlow: [244, 63, 94, 60],
    o: [59, 130, 246],
    oGlow: [59, 130, 246, 60],
    hover: [255, 255, 255, 15],
    winLine: [250, 204, 21],
};

/* ============================================
   WEB AUDIO — lightweight sound effects
   No external files needed
   ============================================ */
let audioCtx = null;

function initAudio() {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { }
}

function playTone(freq, duration, type, vol) {
    if (!soundEnabled || !audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(vol || 0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (duration || 0.15));
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + (duration || 0.15));
    } catch (e) { }
}

function sndPlace() { playTone(600, 0.08, 'sine', 0.50); }
function sndAIPlace() { playTone(400, 0.1, 'triangle', 0.45); }
function sndWin() { playTone(523, 0.1, 'sine', 0.60); setTimeout(() => playTone(659, 0.1, 'sine', 0.60), 100); setTimeout(() => playTone(784, 0.2, 'sine', 0.65), 200); }
function sndLose() { playTone(300, 0.15, 'sawtooth', 0.50); setTimeout(() => playTone(250, 0.2, 'sawtooth', 0.50), 150); }
function sndTie() { playTone(440, 0.12, 'triangle', 0.55); setTimeout(() => playTone(440, 0.12, 'triangle', 0.55), 150); }
function sndUndo() { playTone(500, 0.06, 'sine', 0.40); }
function sndError() { playTone(200, 0.1, 'square', 0.35); }
function sndReset() { playTone(800, 0.05, 'sine', 0.50); setTimeout(() => playTone(600, 0.05, 'sine', 0.50), 50); }



/* ============================================
   CONFETTI
   ============================================ */
function spawnConfetti(count) {
    const colors = ['#f43f5e', '#3b82f6', '#a78bfa', '#fbbf24', '#34d399', '#818cf8'];
    for (let i = 0; i < count; i++) {
        const el = document.createElement('div');
        el.className = 'confetti-piece';
        el.style.left = Math.random() * 100 + 'vw';
        el.style.top = '-10px';
        el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        el.style.width = (Math.random() * 8 + 4) + 'px';
        el.style.height = (Math.random() * 8 + 4) + 'px';
        el.style.animationDuration = (Math.random() * 2 + 1.5) + 's';
        el.style.animationDelay = (Math.random() * 0.4) + 's';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 3500);
    }
}

/* ============================================
   LOCAL STORAGE — persist scores & settings
   ============================================ */
function saveState() {
    try {
        localStorage.setItem('ttt_state', JSON.stringify({
            difficulty,
            aiGoesFirst,
            soundEnabled,
            scoreAI,
            scoreTie,
            scoreYou,
            streakAI,
            streakYou,
            bestStreakYou,
            bestStreakAI,
            totalGames
        }));
    } catch (e) { }
}

function loadState() {
    try {
        const s = JSON.parse(localStorage.getItem('ttt_state'));
        if (!s) return;
        difficulty = s.difficulty || 'medium';
        aiGoesFirst = s.aiGoesFirst !== undefined ? s.aiGoesFirst : true;
        soundEnabled = s.soundEnabled !== undefined ? s.soundEnabled : true;
        if (s.scoreAI !== undefined) scoreAI = s.scoreAI;
        if (s.scoreTie !== undefined) scoreTie = s.scoreTie;
        if (s.scoreYou !== undefined) scoreYou = s.scoreYou;
        if (s.streakAI !== undefined) streakAI = s.streakAI;
        if (s.streakYou !== undefined) streakYou = s.streakYou;
        if (s.bestStreakYou !== undefined) bestStreakYou = s.bestStreakYou;
        if (s.bestStreakAI !== undefined) bestStreakAI = s.bestStreakAI;
        if (s.totalGames !== undefined) totalGames = s.totalGames;
    } catch (e) { }
}

/* ============================================
   P5.JS SETUP
   ============================================ */
function setup() {
    let canvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
    canvas.parent('canvas-container');
    w = width / 3;
    h = height / 3;
    textFont('monospace');

    initAudio();
    loadState();

    // Wire controls
    wireControls();

    // Apply loaded settings to UI
    applySettingsToUI();

    // Start game
    // Only let AI make first move if board is empty and not restoring from saved state
    if (aiGoesFirst && board.every(row => row.every(cell => cell === ''))) {
        bestMove();
    }
    startTimer();
    updateTurnIndicator();
    // Update scoreboard/stats from loaded state
    updateScoreboard();
    updateStats();
}

/* ============================================
   WIRE UI CONTROLS
   ============================================ */
function wireControls() {
    // Replay
    let replayBtn = document.getElementById('replayBtn');
    if (replayBtn) replayBtn.addEventListener('click', (e) => { e.preventDefault(); resetGame(); });

    // Undo
    let undoBtn = document.getElementById('undoBtn');
    if (undoBtn) undoBtn.addEventListener('click', (e) => { e.preventDefault(); undoMove(); });

    // Reset scores
    let resetScoreBtn = document.getElementById('resetScoreBtn');
    if (resetScoreBtn) resetScoreBtn.addEventListener('click', (e) => { e.preventDefault(); resetScores(); });

    // Sound toggle
    let soundToggle = document.getElementById('soundToggle');
    if (soundToggle) soundToggle.addEventListener('click', () => toggleSound());

    // Difficulty buttons
    document.querySelectorAll('#difficultyControl .seg-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('#difficultyControl .seg-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            difficulty = this.dataset.val;
            saveState();
            resetGame();
        });
    });

    // First move buttons
    document.querySelectorAll('#firstMoveControl .seg-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('#firstMoveControl .seg-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            aiGoesFirst = this.dataset.val === 'ai';
            saveState();
            resetGame();
        });
    });

    // ESC / Space to dismiss overlay
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' || e.key === ' ') {
            if (document.getElementById('resultOverlay').classList.contains('show')) {
                e.preventDefault();
                dismissResult();
            }
        }
        // Keyboard shortcuts
        if (e.key === 'n' || e.key === 'N') { if (!e.ctrlKey && !e.metaKey) resetGame(); }
        if (e.key === 'z' || e.key === 'Z') { if (!e.ctrlKey && !e.metaKey) undoMove(); }
        if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undoMove(); }
        if (e.key === 'm' || e.key === 'M') toggleSound();
        if (e.key === '1') setDifficulty('easy');
        if (e.key === '2') setDifficulty('medium');
        if (e.key === '3') setDifficulty('hard');
    });

    // Click overlay to dismiss
    let overlay = document.getElementById('resultOverlay');
    if (overlay) overlay.addEventListener('click', () => dismissResult());
}

function setDifficulty(d) {
    difficulty = d;
    document.querySelectorAll('#difficultyControl .seg-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.val === d);
    });
    saveState();
    resetGame();
}

function applySettingsToUI() {
    // Difficulty
    document.querySelectorAll('#difficultyControl .seg-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.val === difficulty);
    });
    // First move
    document.querySelectorAll('#firstMoveControl .seg-btn').forEach(b => {
        b.classList.toggle('active', (b.dataset.val === 'ai') === aiGoesFirst);
    });
    // Sound
    updateSoundIcon();
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    if (soundEnabled && !audioCtx) initAudio();
    updateSoundIcon();
    saveState();
}

function updateSoundIcon() {
    let el = document.getElementById('soundIcon');
    if (el) el.textContent = soundEnabled ? '🔊' : '🔇';
}

/* ============================================
   WINNER CHECK — original logic
   ============================================ */
function equal(a, b, c) {
    return a == b && b == c && a != '';
}

function checkWinner() {
    let winner = null;
    for (let i = 0; i < 3; i++) {
        if (equal(board[i][0], board[i][1], board[i][2])) winner = board[i][0];
    }
    for (let i = 0; i < 3; i++) {
        if (equal(board[0][i], board[1][i], board[2][i])) winner = board[0][i];
    }
    if (equal(board[0][0], board[1][1], board[2][2])) winner = board[0][0];
    if (equal(board[2][0], board[1][1], board[0][2])) winner = board[2][0];
    let emptyGrid = 0;
    for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++)
            if (board[i][j] == '') emptyGrid++;
    if (winner == null && emptyGrid == 0) return 'tie';
    return winner;
}

/* ============================================
   MOUSE PRESSED
   ============================================ */
function mousePressed() {
    // Resume audio context on first interaction (browser policy)
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();


    // Disable all moves after game is finished or if AI has won
    let winner = checkWinner();
    if (gameEnded || winner === ai) {
        return;
    }

    if (currentPlayer == human && !isResetting) {
        let i = floor(mouseX / w);
        let j = floor(mouseY / h);
        if (i < 0 || i > 2 || j < 0 || j > 2) return;

        if (board[i][j] == '') {
            board[i][j] = human;
            cellPlacedTime[i][j] = millis();
            cellAnimating[i][j] = true;
            moveHistory.push({ i, j, player: human });
            sndPlace();
            updateTurnIndicator();
            updateMoveCount();

            // Check if game is over (win or tie) before letting AI move
            let result = checkWinner();
            if (!gameEnded && result === null) {
                currentPlayer = ai;
                // Show AI thinking icon for 0.1s
                updateTurnIndicator('thinking');
                setTimeout(() => {
                    if (!gameEnded) {
                        bestMove();
                        updateTurnIndicator();
                        updateMoveCount();
                    }
                },225);
            }
        } else {
            sndError();
            let container = document.getElementById('canvas-container');
            container.classList.add('shake');
            setTimeout(() => container.classList.remove('shake'), 300);
        }
    }
}

/* ============================================
   UNDO MOVE — removes last human + AI pair
   ============================================ */
function undoMove() {
    // Disable undo after game is finished
    if (gameEnded || isResetting || moveHistory.length === 0) {
        return;
    }

    // Prevent undoing the first AI move if AI goes first
    if (aiGoesFirst && moveHistory.length === 1) {
        // Do not play any sound at all, just ignore
        return;
    }

    // Undo AI move first (if last was AI)
    if (moveHistory.length > 0 && moveHistory[moveHistory.length - 1].player === ai) {
        let last = moveHistory.pop();
        board[last.i][last.j] = '';
        cellAnimating[last.i][last.j] = false;
    }
    // Then undo human move
    if (moveHistory.length > 0 && moveHistory[moveHistory.length - 1].player === human) {
        let last = moveHistory.pop();
        board[last.i][last.j] = '';
        cellAnimating[last.i][last.j] = false;
    }

    winningCombo = null;
    winLineProgress = 0;
    currentPlayer = human;
    // Only play undo sound if undo actually happened
    sndUndo();
    updateTurnIndicator();
    updateMoveCount();
}

/* ============================================
   INSTANT GAME RESET
   ============================================ */
function resetGame() {
    if (isResetting) return;
    isResetting = true;
    sndReset();
    dismissResult();
    // Save state (with current scores) before resetting board
    saveState();

    let container = document.getElementById('canvas-container');
    if (container) {
        container.classList.add('resetting');
        setTimeout(() => container.classList.remove('resetting'), 350);
    }

    // Reset state instantly — animation is non-blocking visual only
    setTimeout(() => {
        board = [['', '', ''], ['', '', ''], ['', '', '']];
        cellPlacedTime = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
        cellAnimating = [[false, false, false], [false, false, false], [false, false, false]];
        winningCombo = null;
        winLineProgress = 0;
        gameEnded = false;
        moveHistory = [];
        currentPlayer = human;

        loop();
        if (aiGoesFirst) {
            bestMove();
        }
        startTimer();
        updateTurnIndicator();
        updateMoveCount();
        isResetting = false;
    }, 180);
}

/* ============================================
   RESET SCORES
   ============================================ */
function resetScores() {
    scoreAI = 0; scoreTie = 0; scoreYou = 0;
    streakAI = 0; streakYou = 0;
    bestStreakAI = 0; bestStreakYou = 0;
    totalGames = 0;
    updateScoreboard();
    updateStats();
    // Clear storage on score reset
    localStorage.removeItem('ttt_state');
    resetGame();
}

/* ============================================
   TIMER
   ============================================ */
function startTimer() {
    gameStartTime = Date.now();
    if (gameTimerInterval) clearInterval(gameTimerInterval);
    gameTimerInterval = setInterval(updateTimer, 1000);
    updateTimer();
}

function updateTimer() {
    let el = document.getElementById('timerChip');
    if (!el) return;
    let elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
    let mins = Math.floor(elapsed / 60);
    let secs = elapsed % 60;
    el.textContent = '⏱ ' + mins + ':' + (secs < 10 ? '0' : '') + secs;
}

function stopTimer() {
    if (gameTimerInterval) { clearInterval(gameTimerInterval); gameTimerInterval = null; }
}

/* ============================================
   UPDATE UI HELPERS
   ============================================ */
function updateMoveCount() {
    let el = document.getElementById('moveChip');
    if (el) el.textContent = 'Move #' + moveHistory.length;
}

function dismissResult() {
    let overlay = document.getElementById('resultOverlay');
    if (overlay && overlay.classList.contains('show')) {
        overlay.classList.add('hiding');
        overlay.classList.remove('show');
        setTimeout(() => overlay.classList.remove('hiding'), 250);
    }
}

function updateScoreboard() {
    let elAI = document.getElementById('scoreAI');
    let elTie = document.getElementById('scoreTie');
    let elYou = document.getElementById('scoreYou');
    if (elAI) elAI.textContent = scoreAI;
    if (elTie) elTie.textContent = scoreTie;
    if (elYou) elYou.textContent = scoreYou;

    // Streaks
    let sAI = document.getElementById('streakAI');
    let sYou = document.getElementById('streakYou');
    if (sAI) sAI.textContent = streakAI > 1 ? '🔥' + streakAI : '';
    if (sYou) sYou.textContent = streakYou > 1 ? '🔥' + streakYou : '';
}

function bumpScore(elementId) {
    let el = document.getElementById(elementId);
    if (el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
}

function updateStats() {
    let elTotal = document.getElementById('statTotal');
    let elWinRate = document.getElementById('statWinRate');
    let elBest = document.getElementById('statBestStreak');
    if (elTotal) elTotal.textContent = totalGames;
    if (elWinRate) elWinRate.textContent = totalGames > 0 ? Math.round(scoreYou / totalGames * 100) + '%' : '0%';
    if (elBest) elBest.textContent = bestStreakYou;
}

function updateTurnIndicator() {
    let indicator = document.getElementById('turnIndicator');
    let turnText = document.getElementById('turnText');
    if (!indicator || !turnText) return;
    if (gameEnded) {
        indicator.className = 'turn-indicator';
        turnText.textContent = 'Game Over';
        return;
    }
    if (currentPlayer === human) {
        indicator.className = 'turn-indicator your-turn';
        turnText.textContent = 'Your turn (O)';
    } else {
        indicator.className = 'turn-indicator ai-turn';
        turnText.textContent = 'AI thinking...';
    }
}

function showResult(message) {
    let overlay = document.getElementById('resultOverlay');
    let textEl = document.getElementById('resultText');
    if (overlay && textEl) {
        textEl.innerHTML = message;
        setTimeout(() => overlay.classList.add('show'), 250);
    }
}

/* ============================================
   EASING
   ============================================ */
function easeOutBack(t) {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * pow(t - 1, 3) + c1 * pow(t - 1, 2);
}

function easeOutCubic(t) {
    return 1 - pow(1 - t, 3);
}

/* ============================================
   DRAW — main render loop
   ============================================ */
function draw() {
    background(COLORS.bg[0], COLORS.bg[1], COLORS.bg[2]);

    hoveredI = floor(mouseX / w);
    hoveredJ = floor(mouseY / h);
    let isHovering = hoveredI >= 0 && hoveredI < 3 && hoveredJ >= 0 && hoveredJ < 3;

    // Cursor
    let container = document.getElementById('canvas-container');
    if (container) {
        container.classList.toggle('hovering',
            isHovering && !gameEnded && currentPlayer === human && board[hoveredI][hoveredJ] === '');
    }

    // Ghost preview + hover highlight
    if (isHovering && !gameEnded && currentPlayer === human && board[hoveredI][hoveredJ] === '') {
        noStroke();
        fill(COLORS.hover[0], COLORS.hover[1], COLORS.hover[2], COLORS.hover[3]);
        rect(hoveredI * w, hoveredJ * h, w, h, 4);
        // Ghost O
        let gx = hoveredI * w + w / 2, gy = hoveredJ * h + h / 2, gr = w / 4;
        noFill();
        stroke(COLORS.o[0], COLORS.o[1], COLORS.o[2], 35);
        strokeWeight(3);
        ellipse(gx, gy, gr * 2, gr * 2);
    }

    // Grid glow
    stroke(COLORS.gridGlow[0], COLORS.gridGlow[1], COLORS.gridGlow[2], 35);
    strokeWeight(6);
    line(w, 8, w, height - 8); line(w * 2, 8, w * 2, height - 8);
    line(8, h, width - 8, h); line(8, h * 2, width - 8, h * 2);

    // Grid main
    stroke(COLORS.grid[0], COLORS.grid[1], COLORS.grid[2]);
    strokeWeight(2);
    line(w, 8, w, height - 8); line(w * 2, 8, w * 2, height - 8);
    line(8, h, width - 8, h); line(8, h * 2, width - 8, h * 2);

    // Draw X and O
    for (let j = 0; j < 3; j++) {
        for (let i = 0; i < 3; i++) {
            let x = w * i + w / 2, y = h * j + h / 2;
            let spot = board[i][j];
            let r = w / 4;
            if (spot === '') continue;

            let animProgress = 1;
            if (cellAnimating[i][j]) {
                let elapsed = millis() - cellPlacedTime[i][j];
                animProgress = constrain(elapsed / 350, 0, 1);
                animProgress = easeOutBack(animProgress);
                if (elapsed >= 350) cellAnimating[i][j] = false;
            }

            let cr = r * animProgress;
            let ca = 255 * min(animProgress * 2, 1);

            if (spot == human) {
                noFill();
                stroke(COLORS.oGlow[0], COLORS.oGlow[1], COLORS.oGlow[2], COLORS.oGlow[3] * animProgress);
                strokeWeight(8);
                ellipse(x, y, cr * 2.2, cr * 2.2);
                noFill();
                stroke(COLORS.o[0], COLORS.o[1], COLORS.o[2], ca);
                strokeWeight(4);
                ellipse(x, y, cr * 2, cr * 2);
            } else if (spot == ai) {
                stroke(COLORS.xGlow[0], COLORS.xGlow[1], COLORS.xGlow[2], COLORS.xGlow[3] * animProgress);
                strokeWeight(8);
                line(x - cr, y - cr, x + cr, y + cr);
                line(x + cr, y - cr, x - cr, y + cr);
                stroke(COLORS.x[0], COLORS.x[1], COLORS.x[2], ca);
                strokeWeight(4);
                line(x - cr, y - cr, x + cr, y + cr);
                line(x + cr, y - cr, x - cr, y + cr);
            }
        }
    }

    // Check winning combos after all cells are drawn
    if (winningCombo === null) {
        for (let i = 0; i < 3; i++) {
            if (equal(board[i][0], board[i][1], board[i][2]))
                winningCombo = [i, 0, i, 2];
        }
    }
    if (winningCombo === null) {
        for (let j = 0; j < 3; j++) {
            if (equal(board[0][j], board[1][j], board[2][j]))
                winningCombo = [0, j, 2, j];
        }
    }

    if (winningCombo === null && equal(board[0][0], board[1][1], board[2][2]))
        winningCombo = [0, 0, 2, 2];
    if (winningCombo === null && equal(board[2][0], board[1][1], board[0][2]))
        winningCombo = [2, 0, 0, 2];

    // Winning line animation
    if (winningCombo !== null) {
        winLineProgress = min(winLineProgress + 0.05, 1);
        let eased = easeOutCubic(winLineProgress);
        let x1 = winningCombo[0] * w + w / 2, y1 = winningCombo[1] * h + h / 2;
        let x2 = winningCombo[2] * w + w / 2, y2 = winningCombo[3] * h + h / 2;
        let cx2 = lerp(x1, x2, eased), cy2 = lerp(y1, y2, eased);

        stroke(COLORS.winLine[0], COLORS.winLine[1], COLORS.winLine[2], 80);
        strokeWeight(10);
        line(x1, y1, cx2, cy2);
        stroke(COLORS.winLine[0], COLORS.winLine[1], COLORS.winLine[2]);
        strokeWeight(4);
        line(x1, y1, cx2, cy2);

        // Wait for all cell animations to finish before ending the game
        let animating = false;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (cellAnimating[i][j]) animating = true;
            }
        }
        if (winLineProgress >= 1 && !gameEnded && !animating) {
            gameEnded = true;
            stopTimer();
            totalGames++;
            let winner = board[winningCombo[0]][winningCombo[1]];
            if (winner === ai) {
                scoreAI++;
                streakAI++;
                streakYou = 0;
                if (streakAI > bestStreakAI) bestStreakAI = streakAI;
                sndLose();
                showResult('<span class="winner-x">X wins!</span> Better luck next time 🤖');
                bumpScore('scoreAI');
            } else {
                scoreYou++;
                streakYou++;
                streakAI = 0;
                if (streakYou > bestStreakYou) bestStreakYou = streakYou;
                sndWin();
                showResult('<span class="winner-o">O wins!</span> Impressive! 🎉');
                bumpScore('scoreYou');
                spawnConfetti(45);
            }
            updateScoreboard();
            updateStats();
            updateTurnIndicator();
            // Save scores immediately after game ends
            saveState();
            noLoop();
        }
    } else {
        let emptyGrid = 0;
        for (let i = 0; i < 3; i++)
            for (let j = 0; j < 3; j++)
                if (board[i][j] == '') emptyGrid++;
        // Wait for all cell animations to finish before ending the game
        let animating = false;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (cellAnimating[i][j]) animating = true;
            }
        }
        if (emptyGrid == 0 && !gameEnded && !animating) {
            gameEnded = true;
            stopTimer();
            totalGames++;
            scoreTie++;
            streakAI = 0;
            streakYou = 0;
            sndTie();
            showResult('<span class="tie-text">It\'s a Tie!</span> Well played 🤓');
            updateScoreboard();
            updateStats();
            updateTurnIndicator();
            // Save scores immediately after game ends
            saveState();
            noLoop();
        }
    }
}
