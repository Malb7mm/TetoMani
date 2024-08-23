import { createRouter, createWebHistory } from 'vue-router'
import { authorize } from './guard';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
      beforeEnter: authorize,
    },
    {
      path: '/config',
      name: 'config',
      component: () => import('../views/ConfigView.vue'),
      beforeEnter: authorize,
    },
    {
      path: '/play/szlj',
      name: 'play-szlj',
      component: () => import('../views/SZLJQuizView.vue'),
      beforeEnter: authorize,
    },
    {
      path: '/play/endless',
      name: 'play-endless',
      component: () => import('../views/TetEndlessView.vue'),
      beforeEnter: authorize,
    },
    {
      path: '/play/endless-v2',
      name: 'play-endless-v2',
      component: () => import('../views/TetEndlessV2View.vue'),
      beforeEnter: authorize,
    },
    {
      path: '/:catchAll(.*)',
      name: 'notfound',
      component: () => import('../views/NotFoundView.vue'),
      beforeEnter: authorize,
    }
  ]
})

export default router
