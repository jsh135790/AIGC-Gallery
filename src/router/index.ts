import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: '/gallery',
    },
    {
      path: '/gallery',
      name: 'gallery',
      component: () => import('@/pages/ArtistGallery.vue'),
      meta: { title: '画师串画廊', icon: 'Palette' },
    },
    {
      path: '/aigc',
      name: 'aigc',
      component: () => import('@/pages/AIGCManager.vue'),
      meta: { title: 'AIGC 图库', icon: 'Images' },
    },
    {
      path: '/toolbox',
      name: 'toolbox',
      component: () => import('@/pages/Toolbox.vue'),
      meta: { title: '工具箱', icon: 'Wrench' },
    },
  ],
})

router.beforeEach((to) => {
  const title = (to.meta.title as string) || 'AIGC Gallery'
  document.title = `${title} | AIGC Gallery`
})

export default router
