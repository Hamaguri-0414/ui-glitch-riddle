/**
 * 謎解きロジックモジュール
 */
const PuzzleManager = (() => {
    const { $, addClass, removeClass, log } = Utils;

    // 謎データ（デバッグ用：簡単な答え）
    const PUZZLES = [
        {
            id: 0,
            image: 'assets/images/puzzles/puzzle1.png',
            answer: 'あ',
            hint: 'ヒント1: 最初の謎です。',
        },
        {
            id: 1,
            image: 'assets/images/puzzles/puzzle2.png',
            answer: 'い',
            hint: 'ヒント2: 2番目の謎です。',
        },
        {
            id: 2,
            image: 'assets/images/puzzles/puzzle3.png',
            answer: 'う',
            hint: 'ヒント3: 3番目の謎です。',
        },
        {
            id: 3,
            image: 'assets/images/puzzles/puzzle4.png',
            answer: 'え',
            hint: 'ヒント4: 4番目の謎です。',
        },
        {
            id: 4,
            image: 'assets/images/puzzles/puzzle5.png',
            answer: 'お',
            hint: 'ヒント5: 5番目の謎です。',
        },
        {
            id: 5,
            image: 'assets/images/puzzles/puzzle6.png',
            answer: 'か',
            hint: 'ヒント6: 6番目の謎です。',
        },
        {
            id: 6,
            image: 'assets/images/puzzles/puzzle7.png',
            answer: 'き',
            hint: 'ヒント7: 最後の謎です。',
        },
    ];

    // DOM要素
    const DOM = {
        imageDisplay: null,
        feedbackDisplay: null,
        prevBtn: null,
        nextBtn: null,
    };

    /**
     * 初期化
     */
    function init() {
        DOM.imageDisplay = $('#image-display');
        DOM.feedbackDisplay = $('#feedback-display');
        DOM.prevBtn = $('#prev-btn');
        DOM.nextBtn = $('#next-btn');

        // イベントリスナー
        DOM.prevBtn?.addEventListener('click', () => movePuzzle(-1));
        DOM.nextBtn?.addEventListener('click', () => movePuzzle(1));

        // カスタムイベント
        window.addEventListener('answerSubmit', handleAnswerSubmit);
        window.addEventListener('hintRequest', handleHintRequest);

        // メイン画面表示時に初期化
        window.addEventListener('mainScreenReady', () => {
            loadPuzzle(0);
        });

        log.info('Puzzle manager initialized');
    }

    /**
     * 謎を読み込む
     */
    function loadPuzzle(puzzleIndex) {
        if (puzzleIndex < 0 || puzzleIndex >= PUZZLES.length) {
            log.error('Invalid puzzle index:', puzzleIndex);
            return;
        }

        const puzzle = PUZZLES[puzzleIndex];

        // 状態を更新
        AppState.set({
            currentPuzzle: puzzleIndex,
            isTransitioning: true,
        });

        // フェードアウト
        addClass(DOM.imageDisplay, 'fade');

        setTimeout(() => {
            // 画像を読み込み
            DOM.imageDisplay.src = puzzle.image;

            // 入力をクリア
            Keyboard.clearInput();

            // 移動済みキーを更新
            DragSystem.updateMovableKeys();

            // ナビゲーションボタンの表示制御
            updateNavButtons();

            // フェードイン
            DOM.imageDisplay.onload = () => {
                removeClass(DOM.imageDisplay, 'fade');
                AppState.set({ isTransitioning: false });
                log.info(`Puzzle ${puzzleIndex + 1} loaded`);
            };

            // 画像読み込みエラー対策
            if (DOM.imageDisplay.complete) {
                removeClass(DOM.imageDisplay, 'fade');
                AppState.set({ isTransitioning: false });
            }
        }, 300);
    }

    /**
     * 謎を移動
     */
    function movePuzzle(direction) {
        if (AppState.get('isTransitioning')) return;

        const currentPuzzle = AppState.get('currentPuzzle');
        const maxUnlockedPuzzle = AppState.get('maxUnlockedPuzzle');
        const newPuzzle = currentPuzzle + direction;

        // 範囲チェック
        if (newPuzzle < 0 || newPuzzle >= PUZZLES.length) return;

        // 進行チェック（未クリアの謎には進めない）
        if (direction > 0 && newPuzzle > maxUnlockedPuzzle) return;

        loadPuzzle(newPuzzle);
    }

    /**
     * ナビゲーションボタンの表示制御
     */
    function updateNavButtons() {
        const currentPuzzle = AppState.get('currentPuzzle');
        const maxUnlockedPuzzle = AppState.get('maxUnlockedPuzzle');

        // 前ボタン（謎1では非表示）
        if (currentPuzzle === 0) {
            addClass(DOM.prevBtn, 'hidden');
        } else {
            removeClass(DOM.prevBtn, 'hidden');
        }

        // 次ボタン（最後の謎または未クリアの謎では非表示）
        if (currentPuzzle >= maxUnlockedPuzzle || currentPuzzle === PUZZLES.length - 1) {
            addClass(DOM.nextBtn, 'hidden');
        } else {
            removeClass(DOM.nextBtn, 'hidden');
        }
    }

    /**
     * 解答送信処理
     */
    function handleAnswerSubmit() {
        if (AppState.get('isTransitioning')) return;

        const currentPuzzle = AppState.get('currentPuzzle');
        const puzzle = PUZZLES[currentPuzzle];
        const userAnswer = AppState.get('inputText');

        log.info(`Answer submitted: "${userAnswer}" (correct: "${puzzle.answer}")`);

        const isCorrect = userAnswer === puzzle.answer;
        showFeedback(isCorrect);

        if (isCorrect) {
            handleCorrectAnswer(currentPuzzle);
        }
    }

    /**
     * 正解時の処理
     */
    function handleCorrectAnswer(puzzleIndex) {
        // 謎をクリア済みにする
        AppState.markPuzzleCleared(puzzleIndex);

        // 最大進行可能謎を更新
        const maxUnlockedPuzzle = AppState.get('maxUnlockedPuzzle');
        if (puzzleIndex === maxUnlockedPuzzle && puzzleIndex < PUZZLES.length - 1) {
            AppState.set({ maxUnlockedPuzzle: maxUnlockedPuzzle + 1 });
        }

        // 最後の謎の場合はクリア画面へ
        if (puzzleIndex === PUZZLES.length - 1) {
            setTimeout(() => {
                Navigation.showScreen('clear');
            }, 2000);
        } else {
            // 次の謎へ
            setTimeout(() => {
                loadPuzzle(puzzleIndex + 1);
            }, 1500);
        }
    }

    /**
     * フィードバック表示
     */
    function showFeedback(isCorrect) {
        AppState.set({ isTransitioning: true });

        DOM.feedbackDisplay.textContent = isCorrect ? '〇' : '✗';
        DOM.feedbackDisplay.className = 'feedback-display'; // Reset
        addClass(DOM.feedbackDisplay, isCorrect ? 'correct' : 'incorrect');

        requestAnimationFrame(() => {
            addClass(DOM.feedbackDisplay, 'show');
        });

        setTimeout(() => {
            removeClass(DOM.feedbackDisplay, 'show');
            setTimeout(() => {
                if (!isCorrect) {
                    AppState.set({ isTransitioning: false });
                }
            }, 400);
        }, 800);
    }

    /**
     * ヒント要求処理
     */
    function handleHintRequest() {
        const currentPuzzle = AppState.get('currentPuzzle');
        const puzzle = PUZZLES[currentPuzzle];
        Navigation.showHintDialog(puzzle.hint);
    }

    /**
     * 現在の謎を取得
     */
    function getCurrentPuzzle() {
        const currentPuzzle = AppState.get('currentPuzzle');
        return PUZZLES[currentPuzzle];
    }

    return {
        init,
        loadPuzzle,
        getCurrentPuzzle,
    };
})();
