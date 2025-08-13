# ルーティングの移行(App.vue, router.js)

Reactのルーティング（react-router-dom等）とVue Routerの違い、及び移行例を解説します。

## Reactのルーティング例
```jsx
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import IntegrationForm from './components/IntegrationForm';
import IntegrationList from './components/IntegrationList';

function App() {
  return (
    <BrowserRouter>
      <Switch>
        <Route path="/form" component={IntegrationForm} />
        <Route path="/list" component={IntegrationList} />
      </Switch>
    </BrowserRouter>
  );
}
```

## VueJSのルーティング例
### router.js
```js
import { createRouter, createWebHistory } from 'vue-router';
import IntegrationForm from './components/IntegrationForm.vue';
import IntegrationList from './components/IntegrationList.vue';

const routes = [
  { path: '/form', component: IntegrationForm },
  { path: '/list', component: IntegrationList }
];

export default createRouter({
  history: createWebHistory(),
  routes
});
```

### App.vue
```vue
<template>
  <router-view />
</template>
<script>
export default { name: 'App' }
</script>
```

## 主な違い
- ReactはJSXでルーティング、Vueはrouter.jsで定義しApp.vueで<router-view>を使う。
- Vueはルーティング設定が分離されている。

---
