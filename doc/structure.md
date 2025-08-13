## 補足: definePropsについて

Vue3の<script setup>構文では、親コンポーネントから渡されたpropsを受け取るために`defineProps`関数を使います。

- 例: `const props = defineProps({ ProjectId: String, mode: String })`
- これにより、props.ProjectIdやprops.modeとして親から渡された値を参照できます。
- Reactの関数コンポーネントのprops引数（function MyComp(props) { ... }）に相当します。
- 型推論や型安全なprops定義も可能です。

---
## 補足: ルーティングとホットリロードについて

### ルーティング（vue-router）
- Vue3でルーティングを行うには公式ライブラリ「vue-router」を別途インストールする必要があります。
- Reactのreact-router-domに相当。
- インストール例:
  ```sh
  npm install vue-router@4
  ```
- ルーティング設定はrouter.js（またはrouter/index.js）で行い、App.vueで<router-view />を使って描画します。

### ホットリロード（HMR: Hot Module Replacement）
- ViteやVue CLIなどの開発サーバーを使うと、ファイル保存時に自動でブラウザがリロードされます。
- Viteの場合は特別な設定不要で、`npm run dev`で自動的にホットリロードが有効になります。
- 設定例（package.json）:
  ```json
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
  ```
- もしホットリロードが効かない場合は、Viteや依存パッケージのバージョン、設定ファイル（vite.config.js）を確認してください。

---
## 補足: Options APIとComposition APIとは？

Vue3ではコンポーネントの記述方法として「Options API」と「Composition API」の2つのスタイルがあります。

- **Options API**
  - Vue2からある伝統的な書き方。
  - `data`, `methods`, `computed`, `props`, `mounted`などのオプションをオブジェクトでまとめてexportする。
  - Reactで言えば「クラスコンポーネント」に近いイメージ。

- **Composition API**
  - Vue3で導入された新しい書き方。
  - `setup()`関数内で`ref`, `reactive`, `onMounted`などのAPIを使い、状態やロジックを関数的に記述。
  - `<script setup>`構文と組み合わせると、Reactの関数コンポーネントに非常に近い感覚で書ける。
  - ロジックの再利用や型推論、スコープの明確化がしやすい。

**今回の移植ではComposition API（+ script setup）を採用しています。**
React経験者にはComposition APIの方が直感的で学びやすいでしょう。

---
# ReactとVueJSの全体構成・考え方の違い

## 1. コンポーネントの基本構造

ReactとVueJSのコンポーネントは「状態（state/data）」と「表示（render/template）」を持つ点で似ていますが、記述方法や仕組みが異なります。

### Reactの例
```jsx
import React, { useState } from 'react';

function Counter() {
  // useStateで状態(count)を宣言
  const [count, setCount] = useState(0);
  // JSXでUIを記述
  return (
    <button onClick={() => setCount(count + 1)}>
      {count}
    </button>
  );
}
```

### Vueの例
```vue
<template>
  <button @click="count++">
    {{ count }}
  </button>
</template>

<script>
export default {
  // data()はVueのコンポーネントで「状態」を宣言する特別なメソッドです。
  // Vueが自動的に呼び出し、返したオブジェクトの各プロパティがリアクティブな状態となります。
  data() {
    return {
      count: 0 // 状態(count)を宣言
    }
  }
}
</script>
```

**ポイント解説：**
- ReactのuseStateは、Vueではdata()で宣言します。
- data()はVueの仕様で、必ずこの名前で定義し、Vueが自動的に呼び出します。
- JSX（React）とtemplate（Vue）はどちらもUIを宣言的に記述します。
- イベントハンドラはReactはonClick、Vueは@click。

---

## 2. 状態管理

- ReactはuseState/useReducerなどのフックで状態を管理します。
- VueはOptions APIではdata()、Composition APIではref()/reactive()で状態を管理します。

## 3. イベントハンドリング

- React: onClick, onChange など
- Vue: @click, @change, v-model など

## 4. Propsの受け渡し

- React: propsで受け取る
- Vue: propsオプションで明示

## 5. ライフサイクル

- React: useEffect
- Vue: mounted, unmounted, watch など

---
