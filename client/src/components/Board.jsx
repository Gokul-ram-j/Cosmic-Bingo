import React from 'react';

const Board = ({
    board,
    onCellClick,
    crossedNumbers = [],
    isMyTurn = false,
    phase = 'playing',
    fillNext = null
}) => {
    // board is an array of 25 items (numbers or null)

    const isInteracting = phase === 'filling' || (phase === 'playing' && isMyTurn);

    return (
        <div className="bingo-board">
            {board.map((num, idx) => {
                const isCrossed = crossedNumbers.includes(num);
                const isFilled = num !== null;

                let className = 'cell';
                if (isFilled) className += ' filled';
                if (isCrossed) className += ' crossed';
                if (!isInteracting) className += ' disabled';

                return (
                    <div
                        key={idx}
                        className={className}
                        onClick={() => onCellClick(idx, num)}
                    >
                        {num}
                    </div>
                );
            })}
        </div>
    );
};

export default Board;
