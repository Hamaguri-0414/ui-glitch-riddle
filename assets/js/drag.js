/**
 * ドラッグ&ドロップシステムモジュール
 */
const DragSystem = (() => {
    const { $, addClass, removeClass, getEventPosition, isInsideElement, showNotification, log } = Utils;

    // ドラッグ状態
    let draggingState = {
        active: false,
        targetKey: null,
        keyChar: null,
        fromMovable: false,
        startX: 0,
        startY: 0,
    };

    // DOM要素
    const DOM = {
        imageViewer: null,
        movableKeysContainer: null,
        keyboardContainer: null,
    };

    /**
     * 初期化
     */
    function init() {
        DOM.imageViewer = $('#image-viewer');
        DOM.movableKeysContainer = $('#movable-keys-container');
        DOM.keyboardContainer = $('#keyboard-container');

        // カスタムイベントリスナー
        window.addEventListener('startDrag', handleStartDragEvent);

        log.info('Drag system initialized');
    }

    /**
     * ドラッグ開始イベント（Keyboardモジュールから）
     */
    function handleStartDragEvent(e) {
        const element = e.detail.element;
        startDrag(element);
    }

    /**
     * ドラッグ開始
     */
    function startDrag(element) {
        const keyChar = element.dataset.key;

        // クリア済み謎ではドラッグ禁止
        const currentPuzzle = AppState.get('currentPuzzle');
        if (AppState.isPuzzleCleared(currentPuzzle)) {
            showNotification('もう動かす必要はないようだ');
            return;
        }

        // 機能キーはドラッグ不可
        const functionalKeys = ['削除', '確定', '説明', 'ヒント', '゛'];
        if (functionalKeys.includes(keyChar)) {
            return;
        }

        const fromMovable = element.parentElement === DOM.movableKeysContainer;

        draggingState = {
            active: true,
            targetKey: element,
            keyChar: keyChar,
            fromMovable: fromMovable,
            startX: 0,
            startY: 0,
        };

        // 元の位置から削除（比率データから）
        if (fromMovable) {
            AppState.removeMovedKey(currentPuzzle, keyChar);
        }

        // ドラッグ中のスタイル
        addClass(element, 'dragging');

        // 移動イベントリスナー
        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('touchmove', handleDragMove, { passive: false });
        document.addEventListener('mouseup', handleDragEnd);
        document.addEventListener('touchend', handleDragEnd);

        AppState.set({ isDragging: true });

        log.info(`Drag started: ${keyChar}`);
    }

    /**
     * ドラッグ移動
     */
    function handleDragMove(e) {
        if (!draggingState.active) return;

        e.preventDefault();

        const pos = getEventPosition(e);
        const dx = pos.x - draggingState.startX;
        const dy = pos.y - draggingState.startY;

        // 初回移動時は開始位置を記録
        if (draggingState.startX === 0 && draggingState.startY === 0) {
            draggingState.startX = pos.x;
            draggingState.startY = pos.y;
            return;
        }

        // transform で移動
        draggingState.targetKey.style.transform = `translate(${dx}px, ${dy}px) scale(1.1)`;
    }

    /**
     * ドラッグ終了
     */
    function handleDragEnd(e) {
        if (!draggingState.active) return;

        const key = draggingState.targetKey;
        const keyChar = draggingState.keyChar;
        const fromMovable = draggingState.fromMovable;

        // 一時的に非表示
        key.style.visibility = 'hidden';

        const keyRect = key.getBoundingClientRect();
        const viewerRect = DOM.imageViewer.getBoundingClientRect();

        // 画像ビューワー内に収まっているか判定
        const isInViewer = isInsideElement(keyRect, viewerRect);

        const currentPuzzle = AppState.get('currentPuzzle');

        // すべての謎からこのキーを削除
        for (let i = 0; i <= 6; i++) {
            AppState.removeMovedKey(i, keyChar);
        }

        // ビューワー内なら比率で保存
        if (isInViewer) {
            const xRatio = (keyRect.left - viewerRect.left) / viewerRect.width;
            const yRatio = (keyRect.top - viewerRect.top) / viewerRect.height;

            AppState.saveMovedKey(currentPuzzle, keyChar, xRatio, yRatio);
            log.info(`Key "${keyChar}" dropped at (${xRatio.toFixed(3)}, ${yRatio.toFixed(3)})`);
        } else {
            log.info(`Key "${keyChar}" dropped outside viewer, returned to keyboard`);
        }

        // ビューを更新
        requestAnimationFrame(() => {
            updateMovableKeys();

            requestAnimationFrame(() => {
                // 元のキーをクリーンアップ
                if (fromMovable) {
                    key.remove();
                } else {
                    const originalKey = DOM.keyboardContainer.querySelector(`.key[data-key="${keyChar}"]`);
                    if (originalKey) {
                        originalKey.style.transition = 'none';
                        removeClass(originalKey, 'dragging');
                        originalKey.style.transform = '';
                        originalKey.style.visibility = '';

                        requestAnimationFrame(() => {
                            originalKey.style.transition = '';
                        });
                    }
                }

                draggingState.active = false;
                AppState.set({ isDragging: false });
            });
        });

        // イベントリスナー削除
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('touchmove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
        document.removeEventListener('touchend', handleDragEnd);
    }

    /**
     * 移動可能なキーを更新
     */
    function updateMovableKeys() {
        const currentPuzzle = AppState.get('currentPuzzle');
        const movedKeys = AppState.getMovedKeys(currentPuzzle);

        // コンテナをクリア
        DOM.movableKeysContainer.innerHTML = '';

        // キーボード内のキーの表示状態を更新
        const allMovedKeyChars = new Set();
        for (let i = 0; i <= 6; i++) {
            AppState.getMovedKeys(i).forEach(k => allMovedKeyChars.add(k.keyChar));
        }

        const keyboardKeys = DOM.keyboardContainer.querySelectorAll('.key');
        keyboardKeys.forEach(key => {
            const keyChar = key.dataset.key;
            if (allMovedKeyChars.has(keyChar)) {
                addClass(key, 'moved');
            } else {
                removeClass(key, 'moved');
            }
        });

        // 現在の謎の移動済みキーを配置
        const viewerRect = DOM.imageViewer.getBoundingClientRect();

        movedKeys.forEach(({ keyChar, xRatio, yRatio }) => {
            const movableKey = Keyboard.createKeyElement(keyChar, true);
            movableKey.style.position = 'absolute';

            // 比率から絶対座標を計算
            const x = xRatio * viewerRect.width;
            const y = yRatio * viewerRect.height;

            movableKey.style.left = `${x}px`;
            movableKey.style.top = `${y}px`;

            // イベントリスナー
            movableKey.addEventListener('mousedown', handleMovableKeyPress);
            movableKey.addEventListener('touchstart', handleMovableKeyPress, { passive: false });

            DOM.movableKeysContainer.appendChild(movableKey);
        });
    }

    /**
     * 移動可能なキーの押下
     */
    function handleMovableKeyPress(e) {
        e.preventDefault();

        const targetKey = e.target.closest('.key');
        if (!targetKey) return;

        const pos = getEventPosition(e);

        draggingState = {
            active: false,
            targetKey: targetKey,
            keyChar: targetKey.dataset.key,
            fromMovable: true,
            startX: 0,
            startY: 0,
        };

        // 長押しタイマー（2秒）
        const longPressTimer = setTimeout(() => {
            startDrag(targetKey);
        }, 2000);

        // 移動またはリリースでタイマークリア
        const clearTimer = () => {
            clearTimeout(longPressTimer);
            document.removeEventListener('mousemove', clearTimer);
            document.removeEventListener('touchmove', clearTimer);
            document.removeEventListener('mouseup', clearTimer);
            document.removeEventListener('touchend', clearTimer);
        };

        document.addEventListener('mousemove', clearTimer);
        document.addEventListener('touchmove', clearTimer);
        document.addEventListener('mouseup', clearTimer);
        document.addEventListener('touchend', clearTimer);
    }

    return {
        init,
        updateMovableKeys,
    };
})();

