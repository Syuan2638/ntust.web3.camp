document.addEventListener('DOMContentLoaded', () => {
    // --- 獲取所有元素 ---
    const envelopePage = document.getElementById('envelope-page');
    const letterPage = document.getElementById('letter-page');
    const gameContainer = document.getElementById('game-container');
    const gameBoardElement = document.getElementById('game-board');
    const minesCountElement = document.getElementById('mines-count');
    const resetButton = document.getElementById('reset-button');
    const penaltyTimerElement = document.getElementById('penalty-timer');
    const hintContainerElement = document.getElementById('hint-container');
    const toolPopup = document.getElementById('tool-popup');
    const toolShovel = document.getElementById('tool-shovel');
    const toolFlag = document.getElementById('tool-flag');

    // --- 開場動畫事件 ---
    envelopePage.addEventListener('click', () => {
        envelopePage.classList.add('hidden');
        letterPage.classList.remove('hidden');
    });
    letterPage.addEventListener('click', () => {
        letterPage.classList.add('hidden');
        gameContainer.classList.remove('hidden');
        startGame();
    });

    // --- 遊戲設定 ---
    const BOARD_WIDTH = 15, BOARD_HEIGHT = 5;
    const MINE_LOCATIONS = [
        { r: 0, c: 0 }, { r: 4, c: 0 }, { r: 0, c: 1 }, { r: 1, c: 1 }, { r: 2, c: 1 }, { r: 3, c: 1 }, { r: 4, c: 1 },
        { r: 0, c: 2 }, { r: 4, c: 2 }, { r: 1, c: 3 }, { r: 0, c: 4 }, { r: 2, c: 4 }, { r: 3, c: 5 }, { r: 1, c: 6 },
        { r: 4, c: 6 }, { r: 3, c: 7 }, { r: 0, c: 8 }, { r: 2, c: 8 }, { r: 1, c: 9 }, { r: 0, c: 10 }, { r: 1, c: 11 },
        { r: 2, c: 12 }, { r: 3, c: 12 }, { r: 4, c: 12 }, { r: 1, c: 13 }, { r: 0, c: 14 }
    ];
    const MINE_COUNT = MINE_LOCATIONS.length;

    // --- 遊戲狀態變數 ---
    let board = [], flags = 0, gameOver = false, failureCount = 0, countdownInterval = null;
    let isHint1Active = false, hint1Progress = 0, hint1PathElements = [];
    let activeCellForPopup = null;

    // --- 工具選單的點擊事件 ---
    toolShovel.addEventListener('click', () => {
        if (activeCellForPopup) {
            const { r, c } = activeCellForPopup;
            if (!board[r][c].isFlagged) {
                revealCell(r, c);
                checkWinCondition();
            }
            closeToolPopup();
        }
    });
    toolFlag.addEventListener('click', () => {
        if (activeCellForPopup) {
            const { r, c } = activeCellForPopup;
            toggleFlag(r, c);
            closeToolPopup();
        }
    });

    // --- 全局點擊事件 ---
    window.addEventListener('click', (event) => {
        if (!toolPopup.classList.contains('hidden')) {
            if (!toolPopup.contains(event.target) && !event.target.classList.contains('cell')) {
                closeToolPopup();
            }
        }
    });

    function startGame() {
        gameOver = false;
        flags = 0;
        failureCount = 0;
        clearInterval(countdownInterval);
        board = [];
        isHint1Active = false;
        hint1Progress = 0;
        hint1PathElements.forEach(el => el.classList.remove('hint-step-active'));
        hint1PathElements = [];
        closeToolPopup();
        gameBoardElement.innerHTML = '';
        gameBoardElement.classList.remove('locked');
        penaltyTimerElement.classList.add('hidden');
        hintContainerElement.classList.add('hidden');
        gameBoardElement.style.gridTemplateColumns = `repeat(${BOARD_WIDTH}, 24px)`;
        minesCountElement.textContent = MINE_COUNT;
        
        for (let r = 0; r < BOARD_HEIGHT; r++) {
            const row = [];
            for (let c = 0; c < BOARD_WIDTH; c++) {
                const cell = { isMine: false, isRevealed: false, isFlagged: false, element: null, adjacentMines: 0 };
                row.push(cell);
            }
            board.push(row);
        }
        MINE_LOCATIONS.forEach(loc => {
            if (loc.r < BOARD_HEIGHT && loc.c < BOARD_WIDTH) {
                board[loc.r][loc.c].isMine = true;
            }
        });
        for (let r = 0; r < BOARD_HEIGHT; r++) {
            for (let c = 0; c < BOARD_WIDTH; c++) {
                if (!board[r][c].isMine) {
                    board[r][c].adjacentMines = calculateAdjacentMines(r, c);
                }
            }
        }
        createBoardElement();
        for (let r = 0; r < BOARD_HEIGHT; r++) {
            for (let c = 0; c < BOARD_WIDTH; c++) {
                if (!board[r][c].isMine && (board[r][c].adjacentMines === 0 || board[r][c].adjacentMines === 5)) {
                    revealCell(r, c);
                }
            }
        }
        resetButton.addEventListener('click', startGame);
    }

    function createBoardElement() {
        for (let r = 0; r < BOARD_HEIGHT; r++) {
            for (let c = 0; c < BOARD_WIDTH; c++) {
                const cellElement = document.createElement('div');
                cellElement.classList.add('cell');
                cellElement.dataset.row = r;
                cellElement.dataset.col = c;
                cellElement.addEventListener('click', (event) => {
                    event.stopPropagation();
                    handleCellClick(r, c, event);
                });
                board[r][c].element = cellElement;
                gameBoardElement.appendChild(cellElement);
            }
        }
    }
    
    function handleCellClick(r, c, event) {
        if (gameOver) return;

        // 提示序列的點擊邏輯
        if (isHint1Active) {
            const cell = board[r][c];
            if (cell.isRevealed) {
                let sequenceAdvanced = false;
                if (hint1Progress === 0 && cell.element.querySelector('img[alt="比特幣"]')) {
                    hint1Progress = 1; sequenceAdvanced = true;
                } else if (hint1Progress === 1 && cell.element.querySelector('img[alt="以太幣"]')) {
                    hint1Progress = 2; sequenceAdvanced = true;
                } else if (hint1Progress === 2 && cell.element.querySelector('img[alt="波卡"]')) {
                    revealHint1Reward(); return;
                }
                if (sequenceAdvanced) {
                    cell.element.classList.add('hint-step-active');
                    hint1PathElements.push(cell.element);
                    return;
                }
            }
        }

        // 正常遊戲：打開工具選單
        if (board[r][c].isRevealed) {
            closeToolPopup();
            return;
        }
        activeCellForPopup = { r, c };
        const rect = event.target.getBoundingClientRect();
        toolPopup.style.top = `${window.scrollY + rect.bottom + 5}px`;
        toolPopup.style.left = `${window.scrollX + rect.left + rect.width / 2 - toolPopup.offsetWidth / 2}px`;
        toolPopup.classList.remove('hidden');
    }
    
    function toggleFlag(r, c) {
        if (gameOver || board[r][c].isRevealed) return;
        const cell = board[r][c];
        cell.isFlagged = !cell.isFlagged;
        cell.element.classList.toggle('flagged');
        if (cell.isFlagged) flags++; else flags--;
        minesCountElement.textContent = MINE_COUNT - flags;
    }

    function closeToolPopup() {
        toolPopup.classList.add('hidden');
        activeCellForPopup = null;
    }

    function revealCell(r, c) {
        if (r < 0 || r >= BOARD_HEIGHT || c < 0 || c >= BOARD_WIDTH || board[r][c].isRevealed) return;
        const cell = board[r][c];
        cell.isRevealed = true;
        cell.element.classList.add('revealed');
        if (cell.isFlagged) toggleFlag(r, c); // 挖掘時自動移除旗幟
        if (cell.isMine) {
            cell.element.classList.add('mine');
            failureCount++;
            if (failureCount >= 3) startPenalty();
            return;
        }
        const img = document.createElement('img');
        img.classList.add('crypto-icon');
        let hasCustomImage = true;
        if (cell.adjacentMines === 1) {
            img.src = 'images/bitcoin.png'; img.alt = '比特幣';
        } else if (cell.adjacentMines === 2) {
            img.src = 'images/ethereum.png'; img.alt = '以太幣';
        } else if (cell.adjacentMines === 3 && r === 0 && c === 3) {
            img.src = 'images/letter.png'; img.alt = 'Letter';
        } else if (cell.adjacentMines === 3 && r === 2 && c === 7) {
            img.src = 'images/polkadot.png'; img.alt = '波卡';
        } else if (cell.adjacentMines === 4) {
            img.src = 'images/Litecoin.png'; img.alt = 'Litecoin';
        } else {
            hasCustomImage = false;
        }
        if (hasCustomImage) {
            cell.element.appendChild(img);
        } else if (cell.adjacentMines > 0) {
            cell.element.textContent = cell.adjacentMines;
            cell.element.dataset.mines = cell.adjacentMines;
        } else {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    revealCell(r + dr, c + dc);
                }
            }
        }
    }
    
    function calculateAdjacentMines(r, c) {
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const newR = r + dr;
                const newC = c + dc;
                if (newR >= 0 && newR < BOARD_HEIGHT && newC >= 0 && newC < BOARD_WIDTH && board[newR][newC].isMine) {
                    count++;
                }
            }
        }
        return count;
    }
    
    function checkWinCondition() {
        let revealedNonMineCount = 0;
        for (let r = 0; r < BOARD_HEIGHT; r++) {
            for (let c = 0; c < BOARD_WIDTH; c++) {
                if (board[r][c].isRevealed && !board[r][c].isMine) {
                    revealedNonMineCount++;
                }
            }
        }
        if (revealedNonMineCount === (BOARD_WIDTH * BOARD_HEIGHT) - MINE_COUNT) {
            endGame(true);
        }
    }
    
    function endGame(isWin) {
        gameOver = true;
        closeToolPopup();
        if (isWin) {
            for (let r = 0; r < BOARD_HEIGHT; r++) {
                for (let c = 0; c < BOARD_WIDTH; c++) {
                    if (board[r][c].isMine) {
                        board[r][c].element.classList.add('mine');
                        board[r][c].element.classList.remove('flagged');
                    }
                }
            }
            setTimeout(() => {
                alert('恭喜你！你找到了所有安全格！');
            }, 300);
        }
    }

    function startPenalty() {
        gameBoardElement.classList.add('locked');
        penaltyTimerElement.classList.remove('hidden');
        hintContainerElement.classList.add('hidden');
        let timeLeft = 60;
        penaltyTimerElement.textContent = `請等待 ${timeLeft} 秒...`;
        countdownInterval = setInterval(() => {
            timeLeft--;
            penaltyTimerElement.textContent = `請等待 ${timeLeft} 秒...`;
            if (timeLeft <= 0) {
                clearInterval(countdownInterval);
                penaltyTimerElement.classList.add('hidden');
                hintContainerElement.classList.remove('hidden');
                gameBoardElement.classList.remove('locked');
                failureCount = 0;
                isHint1Active = true;
            }
        }, 1000);
    }
    
    function revealHint1Reward() {
        alert('提示序列完成！一條線索已被揭示！');
        isHint1Active = false;
        hint1Progress = 0;
        hint1PathElements.forEach(el => el.classList.remove('hint-step-active'));
        hint1PathElements = [];
        
        const rewardCells = [{r: 1, c: 2}, {r: 3, c: 2}];
        rewardCells.forEach(cell => {
            if (!board[cell.r][cell.c].isRevealed) {
                revealCell(cell.r, cell.c);
            }
        });
        checkWinCondition();
    }
});
