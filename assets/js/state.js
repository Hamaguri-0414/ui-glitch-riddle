/**
 * 状態管理モジュール
 * アプリケーション全体の状態を一元管理
 */
const AppState = (() => {
    // デバッグモード
    const DEBUG = true;

    // 初期状態
    let state = {
        currentScreen: 'title',       // 'title', 'main', 'clear'
        currentPuzzle: 0,              // 0-6
        maxUnlockedPuzzle: 0,          // 進行可能な最大謎番号
        inputText: '',                 // 現在の入力テキスト
        movedKeys: {},                 // 謎ごとの移動済みキー情報（比率で保存）
                                       // { 0: [{keyChar, xRatio, yRatio}], 1: [...] }
        clearedPuzzles: [],            // クリア済み謎の配列 [0, 1, 2, ...]
        isTransitioning: false,        // 画面遷移中フラグ
        isDragging: false,             // ドラッグ中フラグ
        isFlicking: false,             // フリック中フラグ
    };

    // 状態変更リスナー
    const listeners = [];

    /**
     * 状態を取得
     */
    function get(key) {
        if (key) {
            return state[key];
        }
        return { ...state };
    }

    /**
     * 状態を更新
     */
    function set(updates) {
        const prevState = { ...state };
        state = { ...state, ...updates };

        if (DEBUG) {
            console.log('[State] Updated:', updates);
            console.log('[State] Current:', state);
        }

        // リスナーに通知
        listeners.forEach(callback => {
            try {
                callback(state, prevState);
            } catch (error) {
                console.error('[State] Listener error:', error);
            }
        });
    }

    /**
     * 状態変更を監視
     */
    function subscribe(callback) {
        listeners.push(callback);
        return () => {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        };
    }

    /**
     * 謎ごとの移動済みキーを保存
     */
    function saveMovedKey(puzzleIndex, keyChar, xRatio, yRatio) {
        if (!state.movedKeys[puzzleIndex]) {
            state.movedKeys[puzzleIndex] = [];
        }

        // 同じキーが既に保存されている場合は削除
        state.movedKeys[puzzleIndex] = state.movedKeys[puzzleIndex].filter(
            k => k.keyChar !== keyChar
        );

        // 新しい位置を保存
        state.movedKeys[puzzleIndex].push({
            keyChar: keyChar,
            xRatio: xRatio,
            yRatio: yRatio,
        });

        set({ movedKeys: { ...state.movedKeys } });

        if (DEBUG) {
            console.log(`[State] Saved key "${keyChar}" at puzzle ${puzzleIndex}:`, { xRatio, yRatio });
        }
    }

    /**
     * 謎ごとの移動済みキーを削除
     */
    function removeMovedKey(puzzleIndex, keyChar) {
        if (!state.movedKeys[puzzleIndex]) {
            return;
        }

        state.movedKeys[puzzleIndex] = state.movedKeys[puzzleIndex].filter(
            k => k.keyChar !== keyChar
        );

        set({ movedKeys: { ...state.movedKeys } });

        if (DEBUG) {
            console.log(`[State] Removed key "${keyChar}" from puzzle ${puzzleIndex}`);
        }
    }

    /**
     * 謎ごとの移動済みキーを取得
     */
    function getMovedKeys(puzzleIndex) {
        return state.movedKeys[puzzleIndex] || [];
    }

    /**
     * 謎をクリア済みにする
     */
    function markPuzzleCleared(puzzleIndex) {
        if (!state.clearedPuzzles.includes(puzzleIndex)) {
            state.clearedPuzzles.push(puzzleIndex);
            set({ clearedPuzzles: [...state.clearedPuzzles] });

            if (DEBUG) {
                console.log(`[State] Puzzle ${puzzleIndex} marked as cleared`);
            }
        }
    }

    /**
     * 謎がクリア済みか判定
     */
    function isPuzzleCleared(puzzleIndex) {
        return state.clearedPuzzles.includes(puzzleIndex);
    }

    /**
     * 状態をリセット（デバッグ用）
     */
    function reset() {
        state = {
            currentScreen: 'title',
            currentPuzzle: 0,
            maxUnlockedPuzzle: 0,
            inputText: '',
            movedKeys: {},
            clearedPuzzles: [],
            isTransitioning: false,
            isDragging: false,
            isFlicking: false,
        };
        set(state);
        console.log('[State] Reset');
    }

    return {
        get,
        set,
        subscribe,
        saveMovedKey,
        removeMovedKey,
        getMovedKeys,
        markPuzzleCleared,
        isPuzzleCleared,
        reset,
        DEBUG,
    };
})();
