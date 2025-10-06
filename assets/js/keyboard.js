/**
 * フリック入力キーボードモジュール
 */
const Keyboard = (() => {
    const { $, addClass, removeClass, getEventPosition, getFlickDirection, log } = Utils;

    // キーマップ（フリック入力の文字配列）
    const KEY_MAP = {
        'あ': ['あ', 'い', 'う', 'え', 'お'],
        'か': ['か', 'き', 'く', 'け', 'こ'],
        'さ': ['さ', 'し', 'す', 'せ', 'そ'],
        'た': ['た', 'ち', 'つ', 'て', 'と'],
        'な': ['な', 'に', 'ぬ', 'ね', 'の'],
        'は': ['は', 'ひ', 'ふ', 'へ', 'ほ'],
        'ま': ['ま', 'み', 'む', 'め', 'も'],
        'や': ['や', '（', 'ゆ', '）', 'よ'],
        'ら': ['ら', 'り', 'る', 'れ', 'ろ'],
        'わ': ['わ', 'を', 'ん', 'ー', null],
    };

    // キーボードレイアウト
    const KEYBOARD_LAYOUT = [
        ['説明', 'あ', 'か', 'さ', '削除'],
        ['ヒント', 'た', 'な', 'は', ''],
        ['', 'ま', 'や', 'ら', ''],
        ['', '゛', 'わ', '確定', ''],
    ];

    // 方向とガイドインデックスのマッピング
    const DIRECTION_TO_GUIDE_INDEX = { 'up': 0, 'left': 1, 'center': 2, 'right': 3, 'down': 4 };
    const DIRECTION_TO_KEYMAP_INDEX = { 'center': 0, 'left': 1, 'up': 2, 'right': 3, 'down': 4 };

    // フリック状態
    let flickingState = {
        active: false,
        startX: 0,
        startY: 0,
        activeKey: null,
        direction: 'center',
        longPressTimer: null,
    };

    // DOM要素
    const DOM = {
        keyboardContainer: null,
        flickGuide: null,
        display: null,
        displayArea: null,
        movableKeysContainer: null,
    };

    /**
     * 初期化
     */
    function init() {
        DOM.keyboardContainer = $('#keyboard-container');
        DOM.flickGuide = $('#flick-guide');
        DOM.display = $('#display');
        DOM.displayArea = $('#display-area');
        DOM.movableKeysContainer = $('#movable-keys-container');

        if (!DOM.keyboardContainer) {
            log.error('Keyboard container not found');
            return;
        }

        createKeyboard();
        setupEventListeners();

        log.info('Keyboard initialized');
    }

    /**
     * キーボードを生成
     */
    function createKeyboard() {
        DOM.keyboardContainer.innerHTML = '';

        KEYBOARD_LAYOUT.flat().forEach(keyChar => {
            if (!keyChar) {
                // 空白セル
                const spacer = document.createElement('div');
                DOM.keyboardContainer.appendChild(spacer);
                return;
            }

            const key = createKeyElement(keyChar, false);
            DOM.keyboardContainer.appendChild(key);
        });
    }

    /**
     * キー要素を生成
     */
    function createKeyElement(keyChar, isMovable = false) {
        const key = document.createElement('div');
        key.className = 'key';
        key.textContent = keyChar;
        key.dataset.key = keyChar;

        // 機能キーの判定
        const functionalKeys = ['削除', '確定', '説明', 'ヒント', '゛'];
        if (functionalKeys.includes(keyChar)) {
            addClass(key, 'functional');
        }

        return key;
    }

    /**
     * イベントリスナー設定
     */
    function setupEventListeners() {
        // キーボードコンテナにイベント委譲
        DOM.keyboardContainer.addEventListener('mousedown', handlePressStart);
        DOM.keyboardContainer.addEventListener('touchstart', handlePressStart, { passive: false });

        // 入力欄エリアにもイベント委譲
        DOM.displayArea.addEventListener('mousedown', handlePressStart);
        DOM.displayArea.addEventListener('touchstart', handlePressStart, { passive: false });

        // 移動可能なキーコンテナにもイベント委譲
        DOM.movableKeysContainer.addEventListener('mousedown', handlePressStart);
        DOM.movableKeysContainer.addEventListener('touchstart', handlePressStart, { passive: false });
    }

    /**
     * キー押下開始
     */
    function handlePressStart(e) {
        const targetKey = e.target.closest('.key');
        if (!targetKey) return;

        // ドラッグ中は無視
        if (AppState.get('isDragging')) return;

        e.preventDefault();

        const pos = getEventPosition(e);
        flickingState = {
            active: true,
            startX: pos.x,
            startY: pos.y,
            activeKey: targetKey,
            direction: 'center',
            longPressTimer: null,
        };

        // 長押しタイマー（2秒でドラッグモード）
        flickingState.longPressTimer = setTimeout(() => {
            // ドラッグモードへ移行
            startDragMode(targetKey);
        }, 2000);

        // フリックガイド表示
        showFlickGuide(targetKey);

        // 移動イベントリスナー
        document.addEventListener('mousemove', handlePressMove);
        document.addEventListener('touchmove', handlePressMove, { passive: false });
        document.addEventListener('mouseup', handlePressEnd);
        document.addEventListener('touchend', handlePressEnd);

        AppState.set({ isFlicking: true });
    }

    /**
     * キー押下移動
     */
    function handlePressMove(e) {
        if (!flickingState.active) return;

        // ドラッグ中は無視
        if (AppState.get('isDragging')) return;

        e.preventDefault();

        const pos = getEventPosition(e);
        const dx = pos.x - flickingState.startX;
        const dy = pos.y - flickingState.startY;
        
        // 長押し中の小さな移動は無視（ドラッグ準備として扱う）
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 50 && flickingState.longPressTimer) {
            // 長押しタイマーが有効な間は、小さな移動を無視
            return;
        }

        const newDirection = getFlickDirection(dx, dy);
        if (newDirection !== flickingState.direction) {
            flickingState.direction = newDirection;
            updateFlickGuideHighlight(newDirection);
        }
    }

    /**
     * キー押下終了
     */
    function handlePressEnd(e) {
        if (!flickingState.active) return;

        // タイマークリア
        clearTimeout(flickingState.longPressTimer);

        // ドラッグ中の場合はドラッグシステムに任せる
        if (AppState.get('isDragging')) {
            flickingState.active = false;
            AppState.set({ isFlicking: false });
            return;
        }

        // フリック入力処理
        hideFlickGuide();
        handleInput(flickingState.activeKey.dataset.key, flickingState.direction);

        // イベントリスナー削除
        document.removeEventListener('mousemove', handlePressMove);
        document.removeEventListener('touchmove', handlePressMove);
        document.removeEventListener('mouseup', handlePressEnd);
        document.removeEventListener('touchend', handlePressEnd);

        flickingState.active = false;
        AppState.set({ isFlicking: false });
    }

    /**
     * フリックガイドを表示
     */
    function showFlickGuide(key) {
        const keyChar = key.dataset.key;
        const chars = KEY_MAP[keyChar];

        // 文字キー以外はガイド表示しない
        if (!chars) return;

        // 特殊なキーのクラス設定
        if (keyChar === 'や') {
            addClass(DOM.flickGuide, 'flick-guide-ya');
        } else if (keyChar === 'わ') {
            addClass(DOM.flickGuide, 'flick-guide-wa');
        }

        const rect = key.getBoundingClientRect();
        DOM.flickGuide.style.left = `${rect.left + rect.width / 2}px`;
        DOM.flickGuide.style.top = `${rect.top + rect.height / 2}px`;

        // ガイド内容生成
        DOM.flickGuide.innerHTML = '';
        const flickChars = [chars[2], chars[1], chars[0], chars[3], chars[4]]; // up, left, center, right, down

        flickChars.forEach(char => {
            const div = document.createElement('div');
            div.className = 'flick-char';
            if (char) {
                div.textContent = char;
                addClass(div, 'visible');
            }
            DOM.flickGuide.appendChild(div);
        });

        removeClass(DOM.flickGuide, 'hidden');
        updateFlickGuideHighlight('center');
    }

    /**
     * フリックガイドを非表示
     */
    function hideFlickGuide() {
        addClass(DOM.flickGuide, 'hidden');
        removeClass(DOM.flickGuide, 'flick-guide-ya');
        removeClass(DOM.flickGuide, 'flick-guide-wa');
    }

    /**
     * フリックガイドのハイライト更新
     */
    function updateFlickGuideHighlight(direction) {
        const children = DOM.flickGuide.children;
        Array.from(children).forEach(c => removeClass(c, 'highlight'));

        const index = DIRECTION_TO_GUIDE_INDEX[direction];
        if (index !== undefined && children[index]) {
            addClass(children[index], 'highlight');
        }
    }

    /**
     * 入力処理
     */
    function handleInput(keyChar, direction) {
        const index = DIRECTION_TO_KEYMAP_INDEX[direction];

        log.info(`Input: key="${keyChar}", direction="${direction}"`);

        switch (keyChar) {
            case '削除':
                // 1文字削除
                const currentText = AppState.get('inputText');
                AppState.set({ inputText: currentText.slice(0, -1) });
                updateDisplay();
                break;

            case '確定':
                // 確定処理（謎解きロジックで実装）
                window.dispatchEvent(new CustomEvent('answerSubmit'));
                break;

            case '説明':
                // 遊び方ダイアログ表示
                Navigation.showHowtoDialog(true);
                break;

            case 'ヒント':
                // ヒントダイアログ表示
                window.dispatchEvent(new CustomEvent('hintRequest'));
                break;

            case '゛':
                // 濁点・半濁点処理
                applyDakuten();
                break;

            default:
                // 通常の文字入力
                if (KEY_MAP[keyChar] && KEY_MAP[keyChar][index]) {
                    const currentText = AppState.get('inputText');
                    AppState.set({ inputText: currentText + KEY_MAP[keyChar][index] });
                    updateDisplay();
                }
                break;
        }
    }

    /**
     * 表示を更新
     */
    function updateDisplay() {
        const inputText = AppState.get('inputText');
        
        // 元の入力欄を更新（子要素を保持しながら）
        if (DOM.display) {
            // キーコンテナを保持しながらテキストのみ更新
            const keysContainer = DOM.display.querySelector('#display-keys-container');
            DOM.display.textContent = inputText;
            if (keysContainer) {
                DOM.display.appendChild(keysContainer);
            }
        }
        
        // 移動された入力欄も更新
        const movedDisplay = document.getElementById('display-moved');
        if (movedDisplay) {
            const movedKeysContainer = movedDisplay.querySelector('#display-keys-container-moved');
            movedDisplay.textContent = inputText;
            if (movedKeysContainer) {
                movedDisplay.appendChild(movedKeysContainer);
            }
        }
    }

    /**
     * 濁点・半濁点を適用
     */
    function applyDakuten() {
        const currentText = AppState.get('inputText');
        if (currentText.length === 0) return;

        const lastChar = currentText[currentText.length - 1];
        const converted = convertToDakuten(lastChar);

        log.info(`Dakuten: "${lastChar}" → "${converted}"`);

        // 常に更新（変換できない文字の場合は同じ文字が設定される）
        AppState.set({ inputText: currentText.slice(0, -1) + converted });
        updateDisplay();
    }

    /**
     * 濁点・半濁点変換
     * か → が → か
     * さ → ざ → さ
     * た → だ → た
     * は → ば → ぱ → は
     */
    function convertToDakuten(char) {
        const dakutenMap = {
            // 清音 → 濁音
            'か': 'が', 'き': 'ぎ', 'く': 'ぐ', 'け': 'げ', 'こ': 'ご',
            'さ': 'ざ', 'し': 'じ', 'す': 'ず', 'せ': 'ぜ', 'そ': 'ぞ',
            'た': 'だ', 'ち': 'ぢ', 'つ': 'づ', 'て': 'で', 'と': 'ど',
            'は': 'ば', 'ひ': 'び', 'ふ': 'ぶ', 'へ': 'べ', 'ほ': 'ぼ',

            // 濁音 → 半濁音（は行のみ）または 清音に戻る
            'が': 'か', 'ぎ': 'き', 'ぐ': 'く', 'げ': 'け', 'ご': 'こ',
            'ざ': 'さ', 'じ': 'し', 'ず': 'す', 'ぜ': 'せ', 'ぞ': 'そ',
            'だ': 'た', 'ぢ': 'ち', 'づ': 'つ', 'で': 'て', 'ど': 'と',
            'ば': 'ぱ', 'び': 'ぴ', 'ぶ': 'ぷ', 'べ': 'ぺ', 'ぼ': 'ぽ',

            // 半濁音 → 清音
            'ぱ': 'は', 'ぴ': 'ひ', 'ぷ': 'ふ', 'ぺ': 'へ', 'ぽ': 'ほ',
        };

        return dakutenMap[char] || char;
    }

    /**
     * ドラッグモード開始（drag.jsに処理を委譲）
     */
    function startDragMode(key) {
        hideFlickGuide();
        flickingState.active = false;
        AppState.set({ isFlicking: false });

        // ドラッグシステムに通知
        window.dispatchEvent(new CustomEvent('startDrag', {
            detail: { element: key }
        }));
    }

    /**
     * 入力をクリア
     */
    function clearInput() {
        AppState.set({ inputText: '' });
        updateDisplay();
    }

    return {
        init,
        createKeyElement,
        clearInput,
    };
})();

