/**
 * メインアプリケーション
 */
(function() {
    'use strict';

    const { log } = Utils;

    /**
     * アプリケーション初期化
     */
    function init() {
        log.info('Application initializing...');

        // 各モジュールの初期化
        Navigation.init();
        Keyboard.init();
        DragSystem.init();
        PuzzleManager.init();

        // デバッグモードの場合、状態インスペクターを表示
        if (AppState.DEBUG) {
            initDebugTools();
        }

        log.info('Application initialized');
    }

    /**
     * デバッグツール初期化
     */
    function initDebugTools() {
        // 状態インスペクター
        const inspector = document.createElement('div');
        inspector.id = 'debug-inspector';
        inspector.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.9);
            color: #0f0;
            padding: 10px;
            font-family: monospace;
            font-size: 12px;
            z-index: 9999;
            max-width: 300px;
            word-break: break-all;
            border-radius: 4px;
        `;
        document.body.appendChild(inspector);

        // 状態変更を監視して表示
        AppState.subscribe((state) => {
            inspector.innerHTML = `
                <div><strong>Debug Inspector</strong></div>
                <div>Screen: ${state.currentScreen}</div>
                <div>Puzzle: ${state.currentPuzzle + 1}/7</div>
                <div>Input: "${state.inputText}"</div>
                <div>Cleared: [${state.clearedPuzzles.join(', ')}]</div>
                <div>Transitioning: ${state.isTransitioning}</div>
            `;
        });

        // グリッド表示ツール（'g'キーで切替）
        document.addEventListener('keydown', (e) => {
            if (e.key === 'g') {
                toggleDebugGrid();
            }
        });

        log.info('Debug tools initialized');
    }

    /**
     * デバッググリッド表示切替
     */
    function toggleDebugGrid() {
        const imageViewer = document.getElementById('image-viewer');
        if (!imageViewer) return;

        const existingGrid = document.getElementById('debug-grid');
        if (existingGrid) {
            existingGrid.remove();
            log.info('Debug grid hidden');
        } else {
            const grid = document.createElement('div');
            grid.id = 'debug-grid';
            grid.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-image:
                    repeating-linear-gradient(
                        0deg,
                        rgba(255, 0, 0, 0.1) 0px,
                        transparent 1px,
                        transparent 10%,
                        rgba(255, 0, 0, 0.1) 10%
                    ),
                    repeating-linear-gradient(
                        90deg,
                        rgba(255, 0, 0, 0.1) 0px,
                        transparent 1px,
                        transparent 10%,
                        rgba(255, 0, 0, 0.1) 10%
                    );
                pointer-events: none;
                z-index: 9998;
            `;
            imageViewer.appendChild(grid);
            log.info('Debug grid shown');
        }
    }

    // DOMContentLoaded後に初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

