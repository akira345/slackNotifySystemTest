import { createRouter, createWebHistory } from 'vue-router';
import IntegrationList from './components/IntegrationList.vue';
import IntegrationForm from './components/IntegrationForm.vue';

const routes = [
  { path: '/integrations', component: IntegrationList, props: { ProjectId: 'TESTPRJ' } },
  { path: '/integrations/new', component: IntegrationForm, props: { mode: 'new', ProjectId: 'TESTPRJ' } },
  { path: '/integrations/:id/edit', component: IntegrationForm, props: { mode: 'edit', ProjectId: 'TESTPRJ' } },
  { path: '/:pathMatch(.*)*', redirect: '/integrations' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
