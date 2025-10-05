# 技術選定の詳細と根拠

## なぜフレームワークを使わないのか

### 判断基準
1. **プロジェクト規模**: 単一ページアプリで、画面数も限定的
2. **既存実装**: sample.txt のプロトタイプがバニラJSで実装されている
3. **パフォーマンス**: モバイル環境での軽量性が重要
4. **学習コスト**: フレームワーク特有の概念を避け、Pure JS で直感的に実装

### バニラJSのメリット
- ビルドプロセス不要 → デプロイが簡単
- 依存関係ゼロ → セキュリティリスク低減
- ファイルサイズ最小 → 読み込み速度最適化
- デバッグが容易 → ブラウザDevToolsだけで完結

### バニラJSのデメリットと対策
| デメリット | 対策 |
|-----------|------|
| 状態管理が複雑 | 単一の状態オブジェクト + Pub/Sub パターン |
| コンポーネント再利用性低 | モジュール化 + テンプレート文字列 |
| DOMの直接操作 | ユーティリティ関数でラップ |

## CSS設計の選定理由

### カスタムプロパティ (CSS Variables)
```css
:root {
  --key-size-vw: 18vw;
  --key-max-size-px: 70px;
  --effective-key-size: min(var(--key-size-vw), var(--key-max-size-px));
  --border-radius: 12px;
  --background-color: #f0f2f5;
  --key-bg-color: #ffffff;
}
```

**採用理由:**
- テーマの一元管理
- JavaScript からの動的変更が可能
- 計算式（`min`, `clamp`）が使える

### ファイル分割
- `variables.css`: 変数定義のみ
- `layout.css`: グリッドレイアウト、Flexbox
- `components.css`: キー、ボタン、ダイアログなどの個別スタイル
- `animations.css`: トランジション、キーフレーム

**採用理由:**
- 保守性向上
- 競合の防止
- 読み込み順序の明確化

## JavaScript モジュール設計

### ファイル分割の方針

#### `state.js` - 状態管理
```javascript
const AppState = (() => {
  let state = { /* ... */ };
  const listeners = [];

  return {
    get: () => ({ ...state }),
    set: (updates) => {
      state = { ...state, ...updates };
      listeners.forEach(cb => cb(state));
    },
    subscribe: (callback) => listeners.push(callback),
  };
})();
```

**役割:**
- アプリケーション全体の状態を一元管理
- 状態変更時の通知機能

#### `keyboard.js` - フリック入力
```javascript
const Keyboard = (() => {
  const keyMap = { /* ... */ };
  let flickState = null;

  return {
    init: (containerEl) => { /* ... */ },
    handleFlick: (key, direction) => { /* ... */ },
    destroy: () => { /* ... */ },
  };
})();
```

**役割:**
- フリック入力のロジック
- キー配置の生成
- フリックガイドの表示

#### `drag.js` - ドラッグ&ドロップ
```javascript
const DragSystem = (() => {
  let dragState = null;

  return {
    enable: () => { /* ... */ },
    disable: () => { /* ... */ },
    startDrag: (element) => { /* ... */ },
    handleDrop: (element, dropZone) => { /* ... */ },
  };
})();
```

**役割:**
- 長押し検出
- ドラッグ処理
- ドロップ領域の判定

#### `puzzle.js` - 謎解きロジック
```javascript
const PuzzleManager = (() => {
  const puzzles = [ /* ... */ ];

  return {
    getCurrent: () => { /* ... */ },
    checkAnswer: (input) => { /* ... */ },
    moveToNext: () => { /* ... */ },
    moveToPrev: () => { /* ... */ },
  };
})();
```

**役割:**
- 謎データの管理
- 正誤判定
- 謎の切り替え

#### `navigation.js` - 画面遷移
```javascript
const Navigation = (() => {
  return {
    showScreen: (screenName) => { /* ... */ },
    showDialog: (dialogName) => { /* ... */ },
    hideDialog: () => { /* ... */ },
  };
})();
```

**役割:**
- 画面遷移の制御
- ダイアログの表示/非表示

## イベント処理戦略

### タッチイベントの優先順位
1. `touchstart` → 長押しタイマー開始 + フリックガイド表示
2. `touchmove` → ドラッグ or フリック方向判定
3. `touchend` → ドラッグ終了 or フリック入力確定

### 長押し判定の実装
```javascript
let longPressTimer = null;

function handleTouchStart(e) {
  longPressTimer = setTimeout(() => {
    // 2秒経過 → ドラッグモード
    startDrag(e.target);
  }, 2000);
}

function handleTouchEnd(e) {
  clearTimeout(longPressTimer);
  // 2秒未満 → フリック入力として処理
}
```

## パフォーマンス最適化戦略

### 1. CSS Transform を使った移動
```javascript
// ❌ 悪い例（リフローが発生）
element.style.left = `${x}px`;
element.style.top = `${y}px`;

// ✅ 良い例（合成のみ）
element.style.transform = `translate(${x}px, ${y}px)`;
```

### 2. requestAnimationFrame の活用
```javascript
function smoothUpdate() {
  requestAnimationFrame(() => {
    // DOM 更新処理
    updateView();
  });
}
```

### 3. イベント委譲
```javascript
// ❌ 悪い例（各キーにリスナー）
keys.forEach(key => {
  key.addEventListener('touchstart', handler);
});

// ✅ 良い例（親要素にのみリスナー）
keyboardContainer.addEventListener('touchstart', (e) => {
  const key = e.target.closest('.key');
  if (key) handler(key);
});
```

## 座標計算の考え方

### ドロップ位置の計算
```javascript
function getDropPosition(draggedEl, dropZone) {
  const dragRect = draggedEl.getBoundingClientRect();
  const zoneRect = dropZone.getBoundingClientRect();

  return {
    x: dragRect.left - zoneRect.left,
    y: dragRect.top - zoneRect.top,
  };
}
```

### 領域内判定
```javascript
function isInsideZone(elementRect, zoneRect) {
  return (
    elementRect.top >= zoneRect.top &&
    elementRect.left >= zoneRect.left &&
    elementRect.bottom <= zoneRect.bottom &&
    elementRect.right <= zoneRect.right
  );
}
```

## モバイル対応の具体策

### ビューポート設定
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover">
```

### スクロール防止
```css
body, html {
  overscroll-behavior: none;
  overflow: hidden;
}
```

### タッチ操作の最適化
```css
.key {
  touch-action: none;  /* ブラウザのデフォルト動作を無効化 */
  -webkit-tap-highlight-color: transparent;  /* タップ時のハイライト削除 */
}
```

## 状態遷移図

```
[タイトル画面]
    ↓ 「はじめる」ボタン
[遊び方ダイアログ]
    ↓ スクロール → 「謎を解きはじめる」ボタン
[メイン画面 - 謎1]
    ↓ 正解
[メイン画面 - 謎2]
    ↓ 正解
    ...
[メイン画面 - 謎7]
    ↓ 正解
[クリア画面]
```

## エラーハンドリング方針

1. **画像読み込みエラー**
   - 代替画像の表示
   - リトライボタンの提供

2. **タッチイベントの衝突**
   - フラグによる排他制御
   - `e.preventDefault()` の適切な使用

3. **不正な操作**
   - クリア済み謎でのパーツ移動 → ダイアログ表示
   - 範囲外へのドロップ → 元の位置に戻す

## デバッグ戦略

### コンソールログの使い分け
```javascript
const DEBUG = true;  // 本番ではfalse

const log = {
  info: (...args) => DEBUG && console.log('[INFO]', ...args),
  warn: (...args) => DEBUG && console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
};
```

### 状態の可視化
```javascript
// 開発時のみ、画面右上に現在の状態を表示
if (DEBUG) {
  const stateDisplay = document.createElement('div');
  stateDisplay.id = 'debug-state';
  stateDisplay.style.cssText = 'position:fixed;top:0;right:0;background:rgba(0,0,0,0.8);color:#0f0;padding:10px;font-size:12px;z-index:9999;';
  document.body.appendChild(stateDisplay);

  AppState.subscribe(state => {
    stateDisplay.textContent = JSON.stringify(state, null, 2);
  });
}
```
