

# React→Vue3（Composition API + script setup）移行ガイド（実例ベース）

このドキュメントは、実際にReactからVue3（script setup + Composition API）へ移植したIntegrationForm/IntegrationListを題材に、設計方針・処理の流れ・構文の違い・機能単位の比較をまとめたものです。

---

## 1. 全体設計・構成方針

- **Vue3ではscript setup + Composition APIを採用**
    - Reactの関数型コンポーネントに近いシンプルな構造。
    - `ref`や`onMounted`などのAPIで状態・副作用を管理。
- **状態管理はuseState→refで1:1に対応**
- **ルーティングやAPI呼び出しもReactのhooks/props設計を踏襲**
- **emitは今回の移植範囲では未使用**（親子通信はルーティングや状態管理で完結）

---

## 2. script setup構文とは？

- Vue3のSFC（Single File Component）で最もシンプルかつ推奨される記法。
- `<script setup>`ブロック内で直接変数・関数を宣言し、テンプレートから参照可能。
- export defaultやreturnは不要。
- Reactの関数コンポーネントのように、ファイル内でローカルスコープを完結できる。

### 例（IntegrationList.vueより抜粋）
```vue
<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
const integrations = ref([]);
const loading = ref(true);
const router = useRouter();
onMounted(async () => {
  // データ取得処理
});
</script>
```

---

## 3. 状態管理（useState→ref）

- Reactの`const [state, setState] = useState(init)`は、Vue3では`const state = ref(init)`で等価。
- 参照・更新は`.value`プロパティ経由。

### 例
```js
// React
const [loading, setLoading] = useState(false);
// Vue3
const loading = ref(false);
loading.value = true;
```

---


## 4. ライフサイクル・副作用（useEffect→onMounted/watch）

- ReactのuseEffect（マウント時/依存値監視）は、Vue3ではonMountedとwatchで役割が分かれています。
- アンマウント時はonUnmounted。

### onMounted
- コンポーネントが「初めてマウントされたとき」に一度だけ実行される処理を記述します。
- Reactの`useEffect(() => { ... }, [])`（依存配列が空）の動作と等価です。

### watch
- 特定の値（refやreactiveで定義した状態）が「変化したとき」に毎回実行される処理を記述します。
- Reactの`useEffect(() => { ... }, [依存値])`の「依存値が変化したとき」の部分に相当します。
- watchは複数の値や関数も監視可能です。

### 使い分けまとめ
- onMounted：初回マウント時のみ実行したい副作用（初期データ取得など）
- watch：状態の変化ごとに実行したい副作用（入力値のバリデーション、API再取得など）

### 例
```js
// React
useEffect(() => { fetchData(); }, []); // 初回のみ
// Vue3
onMounted(() => { fetchData(); });

// React
useEffect(() => { doSomething(state); }, [state]); // stateが変化するたび
// Vue3
watch(state, (newVal, oldVal) => { doSomething(newVal); });
```

---



## 5. イベント・フォーム・双方向バインディング

- ReactはonChange/onSubmitで明示的にハンドラを渡す。
- Vue3はv-modelで双方向バインディング、@submitで関数呼び出し。

### @submit.preventとhandleSubmitについて
- `@submit.prevent="handleSubmit"` は「フォーム送信時にhandleSubmit関数を呼び、かつデフォルトのsubmit動作（ページリロード）を防ぐ」という意味です。
- `handleSubmit`はリアクティブな変数ではなく、script setup内で定義した通常の関数（非同期関数も可）です。
- Reactの`onSubmit={e => { e.preventDefault(); onSubmit(name); }}`に相当します。
- Vueではフォームの各入力値（例：name）はv-modelでバインドされているため、handleSubmit内で直接`name.value`として参照できます。
- そのため、Reactのように`onSubmit(name)`のように引数で値を渡す必要はありません。
- もし引数を渡したい場合は、`@submit.prevent="() => handleSubmit(name)"`のように書くこともできますが、通常はバインド変数を直接参照する設計が一般的です。


- ReactはonChange/onSubmitで明示的にハンドラを渡す。
- Vue3はv-modelで双方向バインディング、@submitで関数呼び出し。

### v-modelのバインド先について
- `v-model="name"` の `name` は「nameという変数（状態）」を指します。
- これは`<script setup>`内で `const name = ref('')` のように定義されたリアクティブな変数です。
- 文字列リテラル（"name"や'someString'）ではなく、テンプレートから参照可能な変数名を指定します。
- したがって、`v-model="name"` や `v-model='name'` のようにクォートで囲んでもVueのテンプレート構文としては同じ意味（どちらも変数参照）ですが、
  通常はダブルクォーテーション（HTML属性値の書き方に準拠）で記述します。
- `v-model=name` のようにクォートなしでも動作しますが、HTMLの属性値として推奨されるのはクォート付きです。
- 文字列リテラルとしてバインドしたい場合は `v-model="'name'"` のように書きますが、これは通常のフォームバインディングでは使いません。

### 例（IntegrationForm.vueより）
```jsx
// React
<input value={name} onChange={e => setName(e.target.value)} />
<form onSubmit={e => { e.preventDefault(); onSubmit(name); }}>
```
```vue
<!-- Vue3 -->
<input v-model="name" />
<form @submit.prevent="handleSubmit">
```

---


## 6. ルーティング・画面遷移

- ReactはuseNavigate/useParams、Vue3はuseRouter/useRoute。
- 画面遷移はrouter.push。

### useRouterとuseRouteの違い
- `useRouter()` は「ルーターインスタンス」を取得し、画面遷移（router.pushなど）や履歴操作を行うために使います。
- `useRoute()` は「現在のルート情報（パス、クエリ、パラメータなど）」を取得するために使います。
- Reactで言えば、useNavigateがuseRouter、useParamsやuseLocationがuseRouteに相当します。

#### 使い分け例（IntegrationForm.vueより）
```js
const router = useRouter(); // 画面遷移や履歴操作用
const route = useRoute();   // 現在のパスやパラメータ取得用

// 例: 編集画面でidパラメータを取得
if (route.params.id) { ... }

// 例: 保存後に一覧画面へ遷移
router.push('/integrations');
```

---

## 7. リスト描画・条件分岐

- Reactはmap、Vue3はv-for。
- 条件分岐は三項演算子や&&、Vue3はv-if/v-else-if/v-else。

### 例
```jsx
// React
{items.map(item => <li key={item.id}>{item.name}</li>)}
{isLoading ? <div>Loading...</div> : <div>Done</div>}
```
```vue
<!-- Vue3 -->
<li v-for="item in items" :key="item.id">{{ item.name }}</li>
<div v-if="loading">Loading...</div>
<div v-else>Done</div>
```

---

## 8. 親子通信・emitについて

- 今回の移植範囲（IntegrationForm/IntegrationList）ではemitは未使用。
- ルーティングや状態管理で親子通信を完結。
- もしemitが必要な場合は`defineEmits`で明示的にイベントを定義。

---

## 9. テンプレート構文・その他

- v-model, v-for, v-if/v-else-if/v-else, :key, :disabled などVue独自のディレクティブを活用。
- script setup内で定義した変数・関数はテンプレートから直接参照可能。

---

## 10. まとめ・学習のポイント

- ReactとVue3（Composition API + script setup）は設計思想が近く、状態管理・副作用・ルーティング・リスト描画などはほぼ1:1で対応可能。
- Vue3独自の構文（script setup, v-model, ref, watch等）を理解すれば、React経験者はスムーズに移行・学習できる。

---
