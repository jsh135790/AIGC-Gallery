import { onMounted, onUnmounted } from 'vue'
import { brandFaviconUrl } from '@/lib/brand'

export function useBrandFavicon() {
  let observer: MutationObserver | undefined

  onMounted(() => {
    const root = document.documentElement
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!link) return

    function update() {
      const primary = getComputedStyle(root).getPropertyValue('--primary').trim()
      if (!primary) return
      // favicon 是独立图像，无法直接继承页面的 currentColor，需要写入实际主题色。
      const href = brandFaviconUrl(`hsl(${primary})`)
      if (link!.getAttribute('href') !== href) link!.setAttribute('href', href)
    }

    // .dark 与行内 --primary 分别承载明暗和强调色；系统主题变更也会走同一入口。
    observer = new MutationObserver(update)
    observer.observe(root, { attributes: true, attributeFilter: ['class', 'style'] })
    update()
  })

  onUnmounted(() => observer?.disconnect())
}
