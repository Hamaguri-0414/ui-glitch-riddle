# UI破壊謎 実装計画

## プロジェクト概要
- モバイル専用の謎解きWebアプリケーション
- フリック入力キーを画像上に配置して謎を解く仕組み
- 全7問の謎を順番にクリアしていく構成

## 技術選定

### フロントエンド基盤
- **Pure HTML/CSS/JavaScript (バニラJS)**
  - 理由: sample.txtのプロトタイプがバニラJSで実装されており、プロジェクト規模的にフレームワークは不要
  - メリット: 軽量、依存関係なし、デバッグが容易
  - デメリット: 状態管理が複雑になる可能性 → モジュール分割で対応

### ファイル構成
```
/
├── index.html              # エントリーポイント
├── assets/
│   ├── css/
│   │   ├── reset.css       # CSSリセット
│   │   ├── variables.css   # CSS変数定義
│   │   ├── layout.css      # 基本レイアウト
│   │   ├── components.css  # コンポーネントスタイル
│   │   └── animations.css  # アニメーション定義
│   ├── js/
│   │   ├── main.js         # アプリケーションエントリーポイント
│   │   ├── state.js        # 状態管理
│   │   ├── keyboard.js     # フリック入力ロジック
│   │   ├── drag.js         # ドラッグ&ドロップ処理
│   │   ├── puzzle.js       # 謎解きロジック
│   │   ├── navigation.js   # 画面遷移管理
│   │   └── utils.js        # ユーティリティ関数
│   └── images/
│       ├── puzzles/        # 謎画像 (puzzle1.png ~ puzzle7.png)
│       └── example.png     # 遊び方の例
└── .gitignore
```

### CSS設計
- **カスタムプロパティ (CSS Variables)** による一元管理
- **BEM記法** でクラス命名（緩やかに適用）
- モバイルファーストアプローチ

### JavaScript設計
- **モジュールパターン** による機能分離
- **イベント駆動** アーキテクチャ
- **状態管理**: 単一の状態オブジェクトで管理

## 実装フェーズ

### Phase 1: 基盤構築
1. プロジェクト構造の作成
2. HTML基本構造の実装
3. CSS変数とレイアウトの定義
4. 状態管理システムの実装

### Phase 2: 画面実装
1. タイトル画面
2. 遊び方ダイアログ
3. メイン画面レイアウト
4. クリア画面

### Phase 3: コア機能実装
1. フリック入力システム
   - キー配置
   - フリック検出
   - 文字入力処理
   - 濁点・削除処理
2. ドラッグ&ドロップシステム
   - 長押し検出（2秒）
   - ドラッグ処理
   - ドロップ判定（画像領域・入力欄内）
   - パーツの固定

### Phase 4: 謎解きロジック
1. 画像切り替えシステム
2. 正誤判定システム
3. パーツ配置の謎ごと保存
4. クリア済み謎の固定処理

### Phase 5: UI/UX改善
1. アニメーション実装
   - フェードイン/アウト
   - 正解/不正解フィードバック
   - ダイアログ表示
2. ヒントシステム
3. エラーハンドリング

### Phase 6: 謎コンテンツ作成
1. 謎画像の作成（7問分）
2. 各謎の正解設定
3. ヒントテキストの作成

### Phase 7: 最終調整
1. モバイル実機テスト
2. パフォーマンス最適化
3. アクセシビリティ対応
4. OGP設定

## 技術的な重要ポイント

### 1. タッチイベント処理
- `touchstart`, `touchmove`, `touchend` の適切な処理
- `preventDefault()` によるスクロール防止
- `passive: false` オプションの使用

### 2. ドラッグ&ドロップ
- 長押し判定: 2秒のタイマー
- ドラッグ中の視覚フィードバック
- ドロップ領域の判定ロジック
- 座標計算（相対位置→絶対位置）

### 3. 状態管理
```javascript
const appState = {
  currentScreen: 'title',  // title, howto, main, clear
  currentPuzzle: 0,        // 0-6
  maxUnlockedPuzzle: 0,    // 進行可能な最大謎番号
  inputText: '',           // 現在の入力テキスト
  movedKeys: {             // 謎ごとの移動済みキー情報（比率で保存）
    0: [{keyChar, xRatio, yRatio, area}],  // area: 'image' | 'input'
    1: [...],                                // xRatio, yRatio: 0.0-1.0
    // ...
  },
  clearedPuzzles: [],      // クリア済み謎の配列
};
```

### 4. フリック入力
- 初期タッチ位置の記録
- 移動距離・方向の計算
- 閾値（30px）による方向判定
- フリックガイドの動的表示

### 5. パーツ配置の永続化
- 謎ごとにパーツ配置情報を**比率**で保存（デバイスサイズに依存しない）
- 謎切り替え時にパーツを復元（比率から絶対座標を再計算）
- クリア済み謎ではパーツ移動を禁止

### 6. レスポンシブ対応
- ビューポート単位（vw, vh）の活用
- `aspect-ratio` による画像領域の維持
- `clamp()` による流動的なフォントサイズ

## データ構造

### 謎データ
```javascript
const puzzles = [
  {
    id: 0,
    image: 'assets/images/puzzles/puzzle1.png',
    answer: 'こたえ',
    hint: 'ヒントテキスト',
  },
  // ... 7問分
];
```

### キー配列データ
```javascript
const keyMap = {
  'あ': ['あ', 'い', 'う', 'え', 'お'],
  'か': ['か', 'き', 'く', 'け', 'こ'],
  // ...
  'わ': ['わ', 'を', 'ん', 'ー', null],
};
```

## UI・画像サイズ比の固定化

### 課題
- ブラウザ拡大によって画像とUIパーツのサイズ比が崩れる問題
- UIパーツを画像上の特定位置に配置する必要があるため、比率の維持が必須

### 解決策: ハイブリッドアプローチ

#### 1. viewport設定でユーザー拡大を禁止
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
```

#### 2. CSS変数による比率ベース設計
```css
:root {
  --app-max-width: 600px;
  --container-width: min(100vw, var(--app-max-width));

  /* 画像エリアは 4:3 固定 */
  --image-width: var(--container-width);
  --image-height: calc(var(--image-width) * 0.75);

  /* キーサイズは画像幅の18% */
  --key-size: calc(var(--image-width) * 0.18);

  /* キー間隔は画像幅の2% */
  --key-gap: calc(var(--image-width) * 0.02);

  /* フォントサイズもキーサイズの比率 */
  --key-font-size: calc(var(--key-size) * 0.36);
}
```

#### 3. 座標を比率で保存・復元
```javascript
// 保存時: 絶対座標 → 比率 (0.0-1.0)
function saveKeyPosition(keyChar, x, y) {
  const imageWidth = DOM.imageViewer.offsetWidth;
  const imageHeight = DOM.imageViewer.offsetHeight;

  movedKeysData[currentPuzzleIndex].push({
    keyChar: keyChar,
    xRatio: x / imageWidth,
    yRatio: y / imageHeight,
  });
}

// 復元時: 比率 → 絶対座標
function restoreKeyPosition(keyData) {
  const imageWidth = DOM.imageViewer.offsetWidth;
  const imageHeight = DOM.imageViewer.offsetHeight;

  const x = keyData.xRatio * imageWidth;
  const y = keyData.yRatio * imageHeight;

  movableKey.style.left = `${x}px`;
  movableKey.style.top = `${y}px`;
}
```

### 謎画像作成ガイドライン

#### 推奨画像サイズ
- **幅**: 1200px
- **高さ**: 900px (4:3比率)
- **フォーマット**: PNG (透過が必要な場合) または WebP

#### UIパーツの実寸参考（600px幅コンテナ基準）
- **キーサイズ**: 約108px × 108px
- **キー間隔**: 約12px
- **フォントサイズ**: 約39px

#### 謎デザイン時の注意
1. 上記サイズのUIパーツテンプレートを作成し、画像編集ソフトで重ねて配置イメージを確認
2. パーツが配置される可能性のある領域を考慮した謎デザイン
3. 画像内のテキストはUIと重ならないよう配置

### デバッグツール: グリッド表示

開発時に画像とUIの比率を視覚的に確認するための機能。

```javascript
if (DEBUG) {
  function toggleDebugGrid() {
    const existingGrid = document.getElementById('debug-grid');
    if (existingGrid) {
      existingGrid.remove();
      return;
    }

    const gridOverlay = document.createElement('div');
    gridOverlay.id = 'debug-grid';
    gridOverlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-image:
        repeating-linear-gradient(0deg, rgba(255,0,0,0.1) 0px, transparent 1px, transparent 10%, rgba(255,0,0,0.1) 10%),
        repeating-linear-gradient(90deg, rgba(255,0,0,0.1) 0px, transparent 1px, transparent 10%, rgba(255,0,0,0.1) 10%);
      pointer-events: none;
      z-index: 9998;
    `;
    DOM.imageViewer.appendChild(gridOverlay);
  }

  // 'g' キーでグリッド表示切替
  document.addEventListener('keydown', (e) => {
    if (e.key === 'g') toggleDebugGrid();
  });
}
```

## パフォーマンス最適化

1. **イベントリスナーの効率化**
   - イベント委譲の活用
   - 不要なリスナーの削除

2. **再描画の最小化**
   - `requestAnimationFrame` の活用
   - CSS `transform` によるアニメーション
   - `will-change` の適切な使用

3. **画像最適化**
   - 適切なサイズでの書き出し (1200x900px)
   - WebP形式の検討

## アクセシビリティ

- セマンティックHTML
- `aria-label` の適切な設定
- キーボード操作のサポート（最低限）
- 十分なコントラスト比

## 開発の注意点

1. **sample.txt のコードを参考にしつつ、要件に合わせて拡張**
   - 既存の良い実装は活かす
   - 不足している機能（ヒント、説明ダイアログなど）を追加

2. **モバイル専用設計**
   - PC表示時は警告メッセージを表示
   - タッチ操作を前提とした UI

3. **謎の数は7問固定**
   - 配列やループで柔軟に対応
   - 謎の追加が容易な設計

4. **デバッグモード**
   - コンソールログの適切な配置
   - 開発時のみ有効化する仕組み
