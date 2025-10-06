/**
 * 画面遷移管理モジュール
 */
const Navigation = (() => {
    const { $, addClass, removeClass, show, hide, log } = Utils;

    // DOM要素
    const DOM = {
        // 画面
        titleScreen: null,
        mainScreen: null,
        clearScreen: null,

        // ダイアログ
        howtoDialog: null,
        hintDialog: null,

        // ボタン
        startBtn: null,
        startPuzzleBtn: null,
        closeHowtoBtn: null,
        closeHintBtn: null,
        shareBtn: null,

        // その他
        howtoText: null,
        hintText: null,
    };

    /**
     * 初期化
     */
    function init() {
        // DOM要素を取得
        DOM.titleScreen = $('#title-screen');
        DOM.mainScreen = $('#main-screen');
        DOM.clearScreen = $('#clear-screen');
        DOM.howtoDialog = $('#howto-dialog');
        DOM.hintDialog = $('#hint-dialog');
        DOM.startBtn = $('#start-btn');
        DOM.startPuzzleBtn = $('#start-puzzle-btn');
        DOM.closeHowtoBtn = $('#close-howto-btn');
        DOM.closeHintBtn = $('#close-hint-btn');
        DOM.shareBtn = $('#share-btn');
        DOM.howtoText = $('.howto-text');
        DOM.hintText = $('#hint-text');

        // イベントリスナー設定
        setupEventListeners();

        // 初期画面表示
        showScreen('title');

        log.info('Navigation initialized');
    }

    /**
     * イベントリスナー設定
     */
    function setupEventListeners() {
        // タイトル画面の「はじめる」ボタン
        DOM.startBtn?.addEventListener('click', handleStartButton);

        // 遊び方ダイアログ
        DOM.startPuzzleBtn?.addEventListener('click', handleStartPuzzle);
        DOM.closeHowtoBtn?.addEventListener('click', closeHowtoDialog);

        // 遊び方ダイアログのスクロール検出
        DOM.howtoText?.addEventListener('scroll', handleHowtoScroll);

        // ヒントダイアログ
        DOM.closeHintBtn?.addEventListener('click', closeHintDialog);

        // クリア画面のシェアボタン
        DOM.shareBtn?.addEventListener('click', handleShareButton);

        // ダイアログのオーバーレイクリックで閉じる
        DOM.howtoDialog?.querySelector('.dialog-overlay')?.addEventListener('click', closeHowtoDialog);
        DOM.hintDialog?.querySelector('.dialog-overlay')?.addEventListener('click', closeHintDialog);
    }

    /**
     * 画面を表示
     */
    function showScreen(screenName) {
        // 全画面を非表示
        removeClass(DOM.titleScreen, 'active');
        removeClass(DOM.mainScreen, 'active');
        removeClass(DOM.clearScreen, 'active');

        // 指定画面を表示
        switch (screenName) {
            case 'title':
                addClass(DOM.titleScreen, 'active');
                AppState.set({ currentScreen: 'title' });
                break;
            case 'main':
                addClass(DOM.mainScreen, 'active');
                AppState.set({ currentScreen: 'main' });
                break;
            case 'clear':
                addClass(DOM.clearScreen, 'active');
                AppState.set({ currentScreen: 'clear' });
                break;
        }

        log.info(`Screen changed to: ${screenName}`);
    }

    /**
     * 「はじめる」ボタンクリック
     */
    function handleStartButton() {
        log.info('Start button clicked');
        showHowtoDialog(false);
    }

    /**
     * 遊び方ダイアログを表示
     */
    function showHowtoDialog(isFromMainScreen = false) {
        // ボタンの表示切替
        if (isFromMainScreen) {
            // メイン画面から開いた場合は「閉じる」ボタン
            hide(DOM.startPuzzleBtn);
            show(DOM.closeHowtoBtn);
        } else {
            // タイトル画面から開いた場合は「謎を解きはじめる」ボタン
            hide(DOM.closeHowtoBtn);
            hide(DOM.startPuzzleBtn); // 初期は非表示（スクロール後に表示）
        }

        // スクロール位置をリセット
        if (DOM.howtoText) {
            DOM.howtoText.scrollTop = 0;
        }

        show(DOM.howtoDialog);

        // スクロール可能か確認（次フレームで判定）
        if (!isFromMainScreen) {
            setTimeout(() => {
                checkScrollAndShowButton();
            }, 100);
        }

        log.info('Howto dialog opened');
    }

    /**
     * 遊び方ダイアログを閉じる
     */
    function closeHowtoDialog() {
        hide(DOM.howtoDialog);
        log.info('Howto dialog closed');
    }

    /**
     * 遊び方ダイアログのスクロール検出
     */
    function handleHowtoScroll(e) {
        checkScrollAndShowButton();
    }

    /**
     * スクロール状態を確認してボタン表示
     */
    function checkScrollAndShowButton() {
        if (!DOM.howtoText) return;

        const element = DOM.howtoText;
        const scrollBottom = element.scrollHeight - element.scrollTop - element.clientHeight;

        // スクロール不要（コンテンツが小さい）またはスクロール完了
        const needsScroll = element.scrollHeight > element.clientHeight;
        const isScrolledToBottom = scrollBottom < 10;

        // 下部までスクロールしたら、またはスクロール不要な場合は「謎を解きはじめる」ボタンを表示
        // closeHowtoBtnがhiddenの場合（タイトルから開いた場合）のみ
        if ((!needsScroll || isScrolledToBottom) && DOM.startPuzzleBtn && DOM.closeHowtoBtn?.classList.contains('hidden')) {
            show(DOM.startPuzzleBtn);
            log.info('Start puzzle button shown (scroll:', needsScroll ? 'completed' : 'not needed', ')');
        }
    }

    /**
     * 「謎を解きはじめる」ボタンクリック
     */
    function handleStartPuzzle() {
        log.info('Start puzzle button clicked');
        closeHowtoDialog();
        showScreen('main');

        // メイン画面の初期化を通知
        window.dispatchEvent(new CustomEvent('mainScreenReady'));
    }

    /**
     * ヒントダイアログを表示
     */
    function showHintDialog(hintText) {
        if (DOM.hintText) {
            DOM.hintText.textContent = hintText;
        }
        show(DOM.hintDialog);
        log.info('Hint dialog opened');
    }

    /**
     * ヒントダイアログを閉じる
     */
    function closeHintDialog() {
        hide(DOM.hintDialog);
        log.info('Hint dialog closed');
    }

    /**
     * Xシェアボタンクリック
     */
    function handleShareButton() {
        const text = 'UI破壊謎をクリアしました！';
        const url = window.location.href;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;

        window.open(twitterUrl, '_blank', 'noopener,noreferrer');
        log.info('Share button clicked');
    }

    return {
        init,
        showScreen,
        showHowtoDialog,
        closeHowtoDialog,
        showHintDialog,
        closeHintDialog,
    };
})();

