/**
 * ユーティリティ関数
 */
const Utils = (() => {
    /**
     * 要素を取得
     */
    function $(selector) {
        return document.querySelector(selector);
    }

    /**
     * 複数要素を取得
     */
    function $$(selector) {
        return Array.from(document.querySelectorAll(selector));
    }

    /**
     * クラスを追加
     */
    function addClass(element, className) {
        if (element) {
            element.classList.add(className);
        }
    }

    /**
     * クラスを削除
     */
    function removeClass(element, className) {
        if (element) {
            element.classList.remove(className);
        }
    }

    /**
     * クラスをトグル
     */
    function toggleClass(element, className, force) {
        if (element) {
            element.classList.toggle(className, force);
        }
    }

    /**
     * 要素を表示
     */
    function show(element) {
        removeClass(element, 'hidden');
    }

    /**
     * 要素を非表示
     */
    function hide(element) {
        addClass(element, 'hidden');
    }

    /**
     * タッチまたはマウスイベントから座標を取得
     */
    function getEventPosition(e) {
        const touch = e.touches ? e.touches[0] : e;
        return {
            x: touch.clientX,
            y: touch.clientY,
        };
    }

    /**
     * 2点間の距離を計算
     */
    function getDistance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * フリック方向を計算
     */
    function getFlickDirection(dx, dy, threshold = 30) {
        const distance = getDistance(0, 0, dx, dy);
        if (distance < threshold) {
            return 'center';
        }

        if (Math.abs(dx) > Math.abs(dy)) {
            return dx > 0 ? 'right' : 'left';
        } else {
            return dy > 0 ? 'down' : 'up';
        }
    }

    /**
     * 要素が別の要素の内部にあるか判定
     */
    function isInsideElement(elementRect, containerRect) {
        return (
            elementRect.top >= containerRect.top &&
            elementRect.left >= containerRect.left &&
            elementRect.bottom <= containerRect.bottom &&
            elementRect.right <= containerRect.right
        );
    }

    /**
     * 通知を表示
     */
    function showNotification(message, duration = 2000) {
        const notification = $('#notification');
        if (!notification) return;

        notification.textContent = message;
        addClass(notification, 'show');

        setTimeout(() => {
            removeClass(notification, 'show');
        }, duration);
    }

    /**
     * ログ出力（デバッグモード時のみ）
     */
    const log = {
        info: (...args) => AppState.DEBUG && console.log('[INFO]', ...args),
        warn: (...args) => AppState.DEBUG && console.warn('[WARN]', ...args),
        error: (...args) => console.error('[ERROR]', ...args),
    };

    return {
        $,
        $$,
        addClass,
        removeClass,
        toggleClass,
        show,
        hide,
        getEventPosition,
        getDistance,
        getFlickDirection,
        isInsideElement,
        showNotification,
        log,
    };
})();
```
