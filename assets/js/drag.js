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
        displayKeysContainer: null,
    };

    /**
     * 初期化
     */
    function init() {
        DOM.imageViewer = $('#image-viewer');
        DOM.movableKeysContainer = $('#movable-keys-container');
        DOM.keyboardContainer = $('#keyboard-container');
        DOM.displayKeysContainer = $('#display-keys-container');

        // カスタムイベントリスナー
        window.addEventListener('startDrag', handleStartDragEvent);

        log.info('Drag system initialized');
        log.info('displayKeysContainer found:', !!DOM.displayKeysContainer);
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

        // すべてのキーをドラッグ可能にする

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
        
        // 入力欄内に収まっているか判定
        const isInDisplay = checkIfInDisplay(keyRect);

        const currentPuzzle = AppState.get('currentPuzzle');

        // すべての謎からこのキーを削除（入力欄以外）
        if (keyChar !== '入力欄') {
            for (let i = 0; i <= 6; i++) {
                AppState.removeMovedKey(i, keyChar);
            }
        } else {
            // 入力欄の場合は現在の謎からのみ削除
            AppState.removeMovedKey(currentPuzzle, keyChar);
        }

        // ビューワー内または入力欄内なら比率で保存
        if (isInViewer || isInDisplay) {
            let xRatio, yRatio;
            
            if (isInDisplay && !isInViewer) {
                // 入力欄内の場合は入力欄内での相対位置を計算
                const displayRect = getDisplayRect();
                if (displayRect) {
                    xRatio = (keyRect.left + keyRect.width/2 - displayRect.left) / displayRect.width;
                    yRatio = (keyRect.top + keyRect.height/2 - displayRect.top) / displayRect.height;
                    // 入力欄内フラグとして負の値を設定（ただし実際の比率も保存）
                    xRatio = -Math.abs(xRatio); // 負の値で入力欄内を示す
                    yRatio = -Math.abs(yRatio);
                } else {
                    xRatio = -0.5; // フォールバック
                    yRatio = -0.5;
                }
                console.log(`🔑 Key "${keyChar}" dropped in display area at relative position (${Math.abs(xRatio).toFixed(3)}, ${Math.abs(yRatio).toFixed(3)})`);
                console.log('🎯 isInDisplay:', isInDisplay, 'isInViewer:', isInViewer);
            } else {
                // 通常の画像ビューワー基準の座標計算
                xRatio = (keyRect.left - viewerRect.left) / viewerRect.width;
                yRatio = (keyRect.top - viewerRect.top) / viewerRect.height;
                
                const dropLocation = isInDisplay ? 'display area' : 'viewer';
                log.info(`Key "${keyChar}" dropped in ${dropLocation} at (${xRatio.toFixed(3)}, ${yRatio.toFixed(3)})`);
            }

            AppState.saveMovedKey(currentPuzzle, keyChar, xRatio, yRatio);
            
            // 入力欄の場合は元の入力欄を非表示にする
            if (keyChar === '入力欄') {
                const originalDisplay = document.getElementById('display');
                if (originalDisplay && originalDisplay !== key) {
                    originalDisplay.style.visibility = 'hidden';
                    originalDisplay.style.opacity = '0';
                }
            }
        } else {
            // 入力欄の場合は元の入力欄を表示に戻す
            if (keyChar === '入力欄') {
                const originalDisplay = document.getElementById('display');
                if (originalDisplay && originalDisplay !== key) {
                    originalDisplay.style.visibility = '';
                    originalDisplay.style.opacity = '';
                }
            }
            log.info(`Key "${keyChar}" dropped outside valid areas, returned to keyboard`);
        }

        // ビューを更新
        requestAnimationFrame(() => {
            updateMovableKeys();

            requestAnimationFrame(() => {
                // 元のキーをクリーンアップ
                if (fromMovable) {
                    key.remove();
                } else {
                    // 入力欄の場合は特別処理
                    if (keyChar === '入力欄') {
                        // 入力欄は元の位置に戻す
                        key.style.transition = 'none';
                        removeClass(key, 'dragging');
                        key.style.transform = '';
                        key.style.visibility = '';

                        requestAnimationFrame(() => {
                            key.style.transition = '';
                        });
                    } else {
                        // 通常のキーの処理
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

        // 入力欄の表示状態を管理（現在の謎のみ）
        const originalDisplay = document.getElementById('display');
        if (originalDisplay) {
            const currentPuzzleMovedKeys = movedKeys.map(k => k.keyChar);
            if (currentPuzzleMovedKeys.includes('入力欄')) {
                originalDisplay.style.visibility = 'hidden';
                originalDisplay.style.opacity = '0';
            } else {
                originalDisplay.style.visibility = '';
                originalDisplay.style.opacity = '';
            }
        }

        // 入力欄内のキーコンテナをクリア（最新の参照を取得）
        const currentDisplayKeysContainer = document.getElementById('display-keys-container');
        if (currentDisplayKeysContainer) {
            currentDisplayKeysContainer.innerHTML = '';
            // 参照を更新
            DOM.displayKeysContainer = currentDisplayKeysContainer;
        }
        
        // 移動された入力欄のキーコンテナもクリア
        const movedDisplayKeysContainer = document.getElementById('display-keys-container-moved');
        if (movedDisplayKeysContainer) {
            movedDisplayKeysContainer.innerHTML = '';
        }

        // 現在の謎の移動済みキーを配置
        const viewerRect = DOM.imageViewer.getBoundingClientRect();

        movedKeys.forEach(({ keyChar, xRatio, yRatio }) => {
            log.info(`Processing moved key: ${keyChar}, ratio: (${xRatio}, ${yRatio})`);
            
            // 入力欄内のキー（xRatio, yRatio が負の値）
            if (xRatio < 0 && yRatio < 0) {
                log.info(`Key "${keyChar}" is for display area`);
                
                // 元の入力欄または移動された入力欄のキーコンテナを探す
                let targetContainer = document.getElementById('display-keys-container');
                console.log('🔍 Original container found:', !!targetContainer);
                
                if (!targetContainer) {
                    targetContainer = document.getElementById('display-keys-container-moved');
                    console.log('🔍 Moved container found:', !!targetContainer);
                }
                
                // それでも見つからない場合は、DOM.displayKeysContainerを使用（最新の参照を取得）
                if (!targetContainer) {
                    // DOM.displayKeysContainerの参照を更新
                    DOM.displayKeysContainer = document.getElementById('display-keys-container');
                    targetContainer = DOM.displayKeysContainer;
                    console.log('🔍 Updated DOM container found:', !!targetContainer);
                }
                
                log.info('targetContainer exists:', !!targetContainer);
                
                if (targetContainer) {
                    const displayKey = Keyboard.createKeyElement(keyChar, true);
                    
                    // 入力欄内での実際の相対位置を計算
                    const actualXRatio = Math.abs(xRatio);
                    const actualYRatio = Math.abs(yRatio);
                    
                    // 入力欄のサイズを取得
                    const containerRect = targetContainer.getBoundingClientRect();
                    const xPos = actualXRatio * containerRect.width;
                    const yPos = actualYRatio * containerRect.height;
                    
                    // 通常のキースタイルを適用
                    displayKey.style.position = 'absolute';
                    displayKey.style.left = `${xPos}px`;
                    displayKey.style.top = `${yPos}px`;
                    displayKey.style.transform = 'translate(-50%, -50%)'; // 中央基準で配置
                    displayKey.style.zIndex = '20'; // 親要素より上に表示
                    displayKey.style.pointerEvents = 'auto';

                    // イベントリスナー
                    displayKey.addEventListener('mousedown', handleMovableKeyPress);
                    displayKey.addEventListener('touchstart', handleMovableKeyPress, { passive: false });

                    targetContainer.appendChild(displayKey);
                    console.log(`🔑 Key "${keyChar}" added at position (${xPos.toFixed(1)}, ${yPos.toFixed(1)}) in container:`, targetContainer.id);
                    console.log(`🔑 Container size:`, containerRect.width, 'x', containerRect.height);
                    log.info(`Key "${keyChar}" placed in display container`);
                } else {
                    log.error('No display keys container found!');
                }
                return;
            }

            let movableKey;
            
            // 入力欄の場合は特別処理
            if (keyChar === '入力欄') {
                // 入力欄のクローンを作成（子要素も含む）
                const originalDisplay = document.getElementById('display');
                movableKey = originalDisplay.cloneNode(true);
                movableKey.id = 'display-moved';
                movableKey.dataset.key = '入力欄';
                // 入力テキストのみを残し、子要素のキーコンテナは空にする
                const textContent = originalDisplay.textContent || '';
                movableKey.innerHTML = `${textContent}<div id="display-keys-container-moved"></div>`;
                // スタイルを保持
                movableKey.style.visibility = 'visible';
                movableKey.style.opacity = '1';
                movableKey.style.transform = '';
                // サイズを元のサイズに固定
                movableKey.style.width = 'calc(var(--key-size) * 3 + var(--key-gap) * 4)';
                movableKey.style.height = 'calc(var(--key-size) * 1.1)';
                movableKey.style.gridColumn = 'unset';
                movableKey.style.margin = '0';
            } else {
                movableKey = Keyboard.createKeyElement(keyChar, true);
            }
            
            movableKey.style.position = 'absolute';
            movableKey.style.zIndex = '1002'; // 入力欄より上に表示

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
     * 入力欄の位置を取得
     */
    function getDisplayRect() {
        // 元の入力欄
        const originalDisplay = document.getElementById('display');
        if (originalDisplay && originalDisplay.style.visibility !== 'hidden') {
            return originalDisplay.getBoundingClientRect();
        }
        
        // 移動された入力欄
        const movedDisplay = document.getElementById('display-moved');
        if (movedDisplay) {
            return movedDisplay.getBoundingClientRect();
        }
        
        return null;
    }

    /**
     * 入力欄内にドロップされたかチェック
     */
    function checkIfInDisplay(keyRect) {
        console.log('🔍 Checking if in display area...');
        console.log('📐 keyRect:', keyRect);
        
        // 元の入力欄
        const originalDisplay = document.getElementById('display');
        console.log('📱 originalDisplay found:', !!originalDisplay);
        if (originalDisplay && originalDisplay.style.visibility !== 'hidden') {
            const displayRect = originalDisplay.getBoundingClientRect();
            console.log('📐 originalDisplayRect:', displayRect);
            if (isInsideElement(keyRect, displayRect)) {
                console.log('✅ Key is inside original display');
                return true;
            }
        }
        
        // 移動された入力欄
        const movedDisplay = document.getElementById('display-moved');
        console.log('📱 movedDisplay found:', !!movedDisplay);
        if (movedDisplay) {
            const movedDisplayRect = movedDisplay.getBoundingClientRect();
            console.log('📐 movedDisplayRect:', movedDisplayRect);
            if (isInsideElement(keyRect, movedDisplayRect)) {
                console.log('✅ Key is inside moved display');
                return true;
            }
        }
        
        console.log('❌ Key is not in any display area');
        return false;
    }

    /**
     * 移動可能なキーの押下
     */
    function handleMovableKeyPress(e) {
        e.preventDefault();

        const targetKey = e.target.closest('.key');
        if (!targetKey) return;

        const pos = getEventPosition(e);
        let startX = pos.x;
        let startY = pos.y;

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

        // 移動チェック（一定距離以上動いた場合のみタイマークリア）
        const checkMove = (moveEvent) => {
            const movePos = getEventPosition(moveEvent);
            const dx = movePos.x - startX;
            const dy = movePos.y - startY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // 50px以上移動した場合のみタイマークリア
            if (distance >= 50) {
                clearTimer();
            }
        };

        // リリースでタイマークリア
        const clearTimer = () => {
            clearTimeout(longPressTimer);
            document.removeEventListener('mousemove', checkMove);
            document.removeEventListener('touchmove', checkMove);
            document.removeEventListener('mouseup', clearTimer);
            document.removeEventListener('touchend', clearTimer);
        };

        document.addEventListener('mousemove', checkMove);
        document.addEventListener('touchmove', checkMove, { passive: false });
        document.addEventListener('mouseup', clearTimer);
        document.addEventListener('touchend', clearTimer);
    }

    return {
        init,
        updateMovableKeys,
    };
})();

