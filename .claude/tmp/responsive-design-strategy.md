# レスポンシブ設計戦略: 画像とUIの比率固定

## 問題の定義

### 要件
- フリック入力のUIパーツ（キー）を謎画像上に自由に配置できる
- 配置したパーツと画像の位置関係は謎の成立条件の一部
- **ブラウザ拡大や異なるデバイスサイズでも、画像とUIの相対的な比率が維持される必要がある**

### 問題のケース
1. ユーザーがブラウザの拡大機能（Ctrl + +）を使用
2. 異なる画面サイズのデバイスでアクセス
3. 横向き・縦向きの回転（※本アプリは縦向き固定推奨）

---

## 解決アプローチ

### アプローチ1: viewport制御 + user-scalable=no ✅ 採用

#### 実装
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
```

#### 効果
- ブラウザのピンチズーム、拡大機能を完全に無効化
- ビューポートサイズが固定され、計算が単純化

#### 注意点
- **アクセシビリティ的には非推奨**
- ただし、本プロジェクトは「謎解きゲーム」であり、意図的な制約として許容される
- 視覚障害者向けの対応は別途検討（音声読み上げ対応など）

---

### アプローチ2: すべてのサイズをコンテナ幅の比率で定義 ✅ 採用

#### 実装
```css
:root {
  /* コンテナの最大幅 */
  --app-max-width: 600px;

  /* 実際のコンテナ幅（ビューポート幅との小さい方） */
  --container-width: min(100vw, var(--app-max-width));

  /* === 画像エリア === */
  --image-width: var(--container-width);
  --image-height: calc(var(--image-width) * 0.75);  /* 4:3比率 */

  /* === UIパーツサイズ（すべて画像幅の比率） === */
  --key-size: calc(var(--image-width) * 0.18);       /* 18% */
  --key-gap: calc(var(--image-width) * 0.02);        /* 2% */
  --key-font-size: calc(var(--key-size) * 0.36);     /* キーサイズの36% */
  --border-radius: calc(var(--image-width) * 0.02);  /* 2% */
}
```

#### 適用例
```css
.app-container {
  width: 100%;
  max-width: var(--app-max-width);
  margin: 0 auto;
}

#image-viewer {
  width: var(--image-width);
  height: var(--image-height);
  position: relative;
  overflow: hidden;
}

.key {
  width: var(--key-size);
  height: var(--key-size);
  font-size: var(--key-font-size);
  border-radius: var(--border-radius);
}

#keyboard-container {
  gap: var(--key-gap);
  padding: var(--key-gap);
}
```

#### メリット
- デバイスサイズが変わっても、**すべての要素が同じ比率でスケール**
- CSS変数を一箇所変更するだけで全体に反映
- JavaScriptに依存しない

---

### アプローチ3: 座標を比率で保存・復元 ✅ 採用

#### 問題
パーツをドロップした位置を `x: 120px, y: 80px` のような絶対座標で保存すると、デバイスサイズが変わったときに位置がずれる。

#### 解決策
座標を**画像サイズに対する比率（0.0 - 1.0）**で保存する。

#### 実装

##### データ構造
```javascript
const movedKeysData = {
  0: [
    { keyChar: 'あ', xRatio: 0.25, yRatio: 0.33, area: 'image' },
    { keyChar: 'か', xRatio: 0.50, yRatio: 0.50, area: 'input' },
  ],
  1: [...],
  // ...
};
```

##### 保存時の処理
```javascript
function saveKeyPosition(keyChar, absoluteX, absoluteY, area) {
  const imageWidth = DOM.imageViewer.offsetWidth;
  const imageHeight = DOM.imageViewer.offsetHeight;

  // 絶対座標 → 比率
  const xRatio = absoluteX / imageWidth;
  const yRatio = absoluteY / imageHeight;

  if (!movedKeysData[currentPuzzleIndex]) {
    movedKeysData[currentPuzzleIndex] = [];
  }

  movedKeysData[currentPuzzleIndex].push({
    keyChar: keyChar,
    xRatio: xRatio,
    yRatio: yRatio,
    area: area,  // 'image' or 'input'
  });
}
```

##### 復元時の処理
```javascript
function restoreKeys(puzzleIndex) {
  const keysData = movedKeysData[puzzleIndex] || [];
  const imageWidth = DOM.imageViewer.offsetWidth;
  const imageHeight = DOM.imageViewer.offsetHeight;

  keysData.forEach(({ keyChar, xRatio, yRatio, area }) => {
    // 比率 → 絶対座標
    const x = xRatio * imageWidth;
    const y = yRatio * imageHeight;

    const movableKey = createKeyElement(keyChar, true);
    movableKey.style.left = `${x}px`;
    movableKey.style.top = `${y}px`;

    if (area === 'image') {
      DOM.movableKeysContainer.appendChild(movableKey);
    } else if (area === 'input') {
      DOM.inputAreaContainer.appendChild(movableKey);
    }
  });
}
```

#### メリット
- デバイスサイズが変わっても**正確な位置に復元**
- データがコンパクト（比率は0.0-1.0の範囲）

---

## 謎画像作成ガイドライン

### 推奨仕様

| 項目 | 値 |
|------|-----|
| 画像サイズ | 1200px × 900px |
| アスペクト比 | 4:3 |
| フォーマット | PNG（透過必要時）/ WebP（軽量化） |
| 色空間 | sRGB |

### UIパーツの実寸（参考値）

**600px幅コンテナを基準とした場合:**

| 要素 | サイズ |
|------|--------|
| キー | 約108px × 108px |
| キー間隔 | 約12px |
| キーフォント | 約39px |
| ボーダー半径 | 約12px |

**実際の画像作成時（1200px幅基準）:**

| 要素 | サイズ |
|------|--------|
| キー | 216px × 216px |
| キー間隔 | 24px |
| キーフォント | 78px |

### デザインワークフロー

1. **テンプレート作成**
   - Photoshop/Figma等で1200×900pxのキャンバスを作成
   - 216×216pxの正方形レイヤーを作成（キーのテンプレート）
   - テンプレートを複製して配置イメージを確認

2. **謎のデザイン**
   - キーが配置される可能性のある領域を避けてテキスト配置
   - または、逆にキーを特定位置に配置させることが謎の解法になるようデザイン

3. **検証**
   - デバッグモードのグリッド表示機能で配置を確認
   - 実際にパーツを動かして意図通りか確認

---

## デバッグツール

### 1. グリッド表示

開発時に画像上に10%刻みのグリッドを表示し、配置位置を視覚的に確認。

```javascript
const DebugTools = (() => {
  function createGrid() {
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
    return grid;
  }

  function toggleGrid() {
    const existing = document.getElementById('debug-grid');
    if (existing) {
      existing.remove();
      console.log('[DEBUG] Grid hidden');
    } else {
      DOM.imageViewer.appendChild(createGrid());
      console.log('[DEBUG] Grid shown');
    }
  }

  function init() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'g' && DEBUG) {
        toggleGrid();
      }
    });
  }

  return { init, toggleGrid };
})();

if (DEBUG) {
  DebugTools.init();
}
```

### 2. 座標表示

ドラッグ中のパーツの座標（絶対値・比率）を表示。

```javascript
function showCoordinates(x, y) {
  const imageWidth = DOM.imageViewer.offsetWidth;
  const imageHeight = DOM.imageViewer.offsetHeight;
  const xRatio = (x / imageWidth).toFixed(3);
  const yRatio = (y / imageHeight).toFixed(3);

  console.log(`[DEBUG] Position: (${x}px, ${y}px) = (${xRatio}, ${yRatio})`);
}
```

### 3. 状態インスペクター

画面右上に現在の状態を常時表示。

```javascript
if (DEBUG) {
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
  `;
  document.body.appendChild(inspector);

  AppState.subscribe((state) => {
    inspector.innerHTML = `
      <div>Puzzle: ${state.currentPuzzle + 1}/7</div>
      <div>Input: "${state.inputText}"</div>
      <div>Keys moved: ${Object.keys(state.movedKeys[state.currentPuzzle] || {}).length}</div>
      <div>Container: ${DOM.imageViewer.offsetWidth}×${DOM.imageViewer.offsetHeight}</div>
    `;
  });
}
```

---

## テスト項目

### デバイスサイズテスト

| デバイス | 幅 | 確認項目 |
|----------|-----|----------|
| iPhone SE | 375px | キーが適切にスケール |
| iPhone 14 Pro | 393px | 同上 |
| Galaxy S22 | 360px | 同上 |
| iPad Mini | 768px | max-width制限で600pxに収まる |

### 比率維持テスト

1. 謎1でパーツを画像の中央（xRatio: 0.5, yRatio: 0.5）に配置
2. ブラウザウィンドウをリサイズ
3. パーツが画像の中央に留まることを確認

### ブラウザ拡大テスト

1. Ctrl+0 （100%）でパーツ配置
2. Ctrl++ （125%）に拡大
3. パーツが画像から相対的にずれないことを確認
4. ※ user-scalable=no により、実際には拡大不可

---

## 代替案の検討記録

### Container Queries を使わない理由

```css
@container app (max-width: 600px) {
  .key {
    width: 18cqw;  /* Container Query Width */
  }
}
```

- **ブラウザサポート**: 2023年以降の新しい機能
- **モバイル対応**: iOS Safari 16+, Android Chrome 105+
- **判断**: サポート範囲は広がっているが、CSS変数による方法で十分実現可能なため不採用

### rem基準にしない理由

```javascript
document.documentElement.style.fontSize = `${baseFontSize}px`;
```

- JavaScript依存が増える
- ブラウザ拡大時にremの基準自体が変わってしまう可能性
- CSS変数の方が明示的で保守性が高い

---

## まとめ

### 採用する設計

1. **viewport制御**: `user-scalable=no` でブラウザ拡大を禁止
2. **CSS変数**: すべてのサイズを `--image-width` の比率で定義
3. **比率ベース保存**: パーツ座標を 0.0-1.0 の比率で保存・復元
4. **デバッグツール**: グリッド表示、座標ログ、状態インスペクター

### 開発時の注意

- すべてのサイズ定義は `calc(var(--image-width) * X)` の形式を使用
- パーツ配置の保存時は必ず比率に変換
- 謎画像は 1200×900px で作成し、UIパーツは 216×216px を基準にデザイン
