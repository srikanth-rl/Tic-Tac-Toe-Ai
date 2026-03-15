/* ============================================
   AI BEST MOVE — with difficulty levels
   easy:       random move
   medium:     50% optimal, 50% random
   hard:       always optimal (minimax)
   ============================================ */
function bestMove() {
    // Difficulty-based random chance
    let useRandom = false;
    if (difficulty === 'easy') {
        useRandom = true;
    } else if (difficulty === 'medium') {
        useRandom = Math.random() < 0.5;
    }
    // hard = never random (always optimal)

    if (useRandom) {
        randomMove();
        return;
    }

    // Optimal minimax move
    let bestScore = -Infinity;
    let minDepth = Infinity;
    let move = { i: 0, j: 0 };
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (board[i][j] == '') {
                board[i][j] = ai;
                let r = minimax(board, 0, false);
                let score = r.s;
                let depth = r.d;
                board[i][j] = '';
                if (score > bestScore) {
                    bestScore = score;
                    minDepth = depth;
                    move = { i, j };
                } else if (score == bestScore && depth < minDepth) {
                    minDepth = depth;
                    move = { i, j };
                }
            }
        }
    }
    placeAI(move.i, move.j);
}

/* ============================================
   RANDOM MOVE — for easier difficulty
   ============================================ */
function randomMove() {
    let available = [];
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (board[i][j] == '') available.push({ i, j });
        }
    }
    if (available.length === 0) return;
    let pick = available[Math.floor(Math.random() * available.length)];
    placeAI(pick.i, pick.j);
}

/* ============================================
   PLACE AI PIECE — shared placement logic
   ============================================ */
function placeAI(i, j) {
    board[i][j] = ai;
    if (typeof cellPlacedTime !== 'undefined') {
        cellPlacedTime[i][j] = millis();
        cellAnimating[i][j] = true;
    }
    if (typeof moveHistory !== 'undefined') {
        moveHistory.push({ i, j, player: ai });
    }
    if (typeof sndAIPlace === 'function') {
        sndAIPlace();
    }
    currentPlayer = human;
}

/* ============================================
   SCORING
   ============================================ */
let scores = {
    X: 10,
    O: -10,
    tie: 0
};

/* ============================================
   MINIMAX — unbeatable AI with alpha-beta
   ============================================ */
function minimax(board, depth, isMaximizing, alpha, beta) {
    let result = checkWinner();
    if (result !== null) {
        return { s: scores[result], d: depth };
    }

    if (alpha === undefined) alpha = -Infinity;
    if (beta === undefined) beta = Infinity;

    if (isMaximizing) {
        let bestScore = -Infinity;
        let bestDepth = Infinity;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (board[i][j] == '') {
                    board[i][j] = ai;
                    let r = minimax(board, depth + 1, false, alpha, beta);
                    board[i][j] = '';
                    if (r.s > bestScore) {
                        bestScore = r.s;
                        bestDepth = r.d;
                    } else if (r.s == bestScore && r.d < bestDepth) {
                        bestDepth = r.d;
                    }
                    alpha = Math.max(alpha, r.s);
                    if (beta <= alpha) break;
                }
            }
            if (beta <= alpha) break;
        }
        return { s: bestScore, d: bestDepth };
    } else {
        let bestScore = Infinity;
        let bestDepth = Infinity;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (board[i][j] == '') {
                    board[i][j] = human;
                    let r = minimax(board, depth + 1, true, alpha, beta);
                    board[i][j] = '';
                    if (r.s < bestScore) {
                        bestScore = r.s;
                        bestDepth = r.d;
                    } else if (r.s == bestScore && r.d < bestDepth) {
                        bestDepth = r.d;
                    }
                    beta = Math.min(beta, r.s);
                    if (beta <= alpha) break;
                }
            }
            if (beta <= alpha) break;
        }
        return { s: bestScore, d: bestDepth };
    }
}
