let board = [
    ['', '', ''],
    ['', '', ''],
    ['', '', '']
];
let w;
let h;

let ai = 'X';
let human = 'O';
let currentPlayer = human;
let winningCombo = null;

function setup() {
    createCanvas(400, 400);
    w = width / 3;
    h = height / 3;
    bestMove();
}

function equal(a, b, c) {
    return a == b && b == c && a != '';
}

function checkWinner() {
    let winner = null;
    for (let i = 0; i < 3; i++) {
        if (equal(board[i][0], board[i][1], board[i][2])) {
            winner = board[i][0];
        }
    } // horizontal
    for (let i = 0; i < 3; i++) {
        if (equal(board[0][i], board[1][i], board[2][i])) {
            winner = board[0][i];
        }
    } // Vertical
    if (equal(board[0][0], board[1][1], board[2][2])) {
        winner = board[0][0];
    } // Diagonal
    if (equal(board[2][0], board[1][1], board[0][2])) {
        winner = board[2][0];
    }
    let emptyGrid = 0;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (board[i][j] == '') {
                emptyGrid++;
            }
        }
    }
    if (winner == null && emptyGrid == 0)
        return 'tie';
    else
        return winner;
}

function mousePressed() {
    if (currentPlayer == human) {
        // Human make turn
        let i = floor(mouseX / w);
        let j = floor(mouseY / h);
        // If valid turn
        if (board[i][j] == '') {
            board[i][j] = human;
            currentPlayer = ai;
            bestMove();
        }
    }
}

function draw() {
    background(255);
    strokeWeight(4);

    line(w, 0, w, height);
    line(w * 2, 0, w * 2, height);
    line(0, h, width, h);
    line(0, h * 2, width, h * 2);
    for (let j = 0; j < 3; j++) {
        for (let i = 0; i < 3; i++) {
            let x = w * i + w / 2;
            let y = h * j + h / 2;
            let spot = board[i][j];
            textSize(32);
            let r = w / 4;
            if (spot == human) {
                noFill();
                ellipse(x, y, r * 2);
            } else if (spot == ai) {
                line(x - r, y - r, x + r, y + r);
                line(x + r, y - r, x - r, y + r);
            }

            if (winningCombo === null && equal(board[i][0], board[i][1], board[i][2])) {
                winningCombo = [i, 0, i, 2];
            }

            if (winningCombo === null && equal(board[0][j], board[1][j], board[2][j])) {
                winningCombo = [0, j, 2, j];
            }
        }
    }

    if (winningCombo === null && equal(board[0][0], board[1][1], board[2][2])) {
        winningCombo = [0, 0, 2, 2];
    }

    if (winningCombo === null && equal(board[2][0], board[1][1], board[0][2])) {
        winningCombo = [2, 0, 0, 2];
    }

    if (winningCombo !== null) {
        stroke(255, 0, 0); // Light black color
        strokeWeight(2); // Line thickness
        let x1 = winningCombo[0] * w + w / 2;
        let y1 = winningCombo[1] * h + h / 2;
        let x2 = winningCombo[2] * w + w / 2;
        let y2 = winningCombo[3] * h + h / 2;
        line(x1, y1, x2, y2);

        noLoop();
        let resultP = createP('');
        resultP.style('font-size', '32pt');
        resultP.html('Sorry Man,you lost!🤖'); //`${board[winningCombo[0]][winningCombo[1]]} wins!`
    } else {
        let emptyGrid = 0;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (board[i][j] == '') {
                    emptyGrid++;
                }
            }
        }
        if (emptyGrid == 0) {
            noLoop();
            let resultP = createP('');
            resultP.style('font-size', '32pt');
            resultP.html('Wow I admire you,it\'s a Tie!🤓');
        }
    }
}