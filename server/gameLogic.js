const calculateScore = (board, crossedNumbers) => {
    let score = 0;
    const size = 5;
    const crossedSet = new Set(crossedNumbers);

    // Check rows
    for (let i = 0; i < size; i++) {
        let isRowComplete = true;
        for (let j = 0; j < size; j++) {
            if (!crossedSet.has(board[i * size + j])) {
                isRowComplete = false;
                break;
            }
        }
        if (isRowComplete) score++;
    }

    // Check columns
    for (let i = 0; i < size; i++) {
        let isColComplete = true;
        for (let j = 0; j < size; j++) {
            if (!crossedSet.has(board[j * size + i])) {
                isColComplete = false;
                break;
            }
        }
        if (isColComplete) score++;
    }

    // Check diagonal 1 (Top-left to bottom-right)
    let diag1Complete = true;
    for (let i = 0; i < size; i++) {
        if (!crossedSet.has(board[i * size + i])) {
            diag1Complete = false;
            break;
        }
    }
    if (diag1Complete) score++;

    // Check diagonal 2 (Top-right to bottom-left)
    let diag2Complete = true;
    for (let i = 0; i < size; i++) {
        if (!crossedSet.has(board[i * size + (size - 1 - i)])) {
            diag2Complete = false;
            break;
        }
    }
    if (diag2Complete) score++;

    return score;
};

module.exports = { calculateScore };
