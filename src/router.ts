import { createRouter } from '@solidjs/router';
import { lazy } from 'solid-js';

export const Router = createRouter({
  routes: [
    { path: '/', component: lazy(() => import('./pages/index')) },
    { path: '/:id', component: lazy(() => import('./pages/[id]')) },
    { path: '*404', component: lazy(() => import('./pages/404')) },
  ],
});
