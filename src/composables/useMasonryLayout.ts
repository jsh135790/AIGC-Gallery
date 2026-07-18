import { computed, type Ref } from 'vue'
import { useElementSize } from '@vueuse/core'
import type { AIGCImage } from '@/types'

/**
 * 有序 JS 列分配瀑布流(拒绝 CSS columns:列优先填充会打乱时间排序的阅读顺序)。
 * 按排序顺序把每张图放进当前累计高度最矮的列 —— 纯比例计算,不量 DOM。
 */
export function useMasonryLayout(
  containerRef: Ref<HTMLElement | null>,
  items: Ref<AIGCImage[]>,
) {
  const { width: containerWidth } = useElementSize(containerRef)

  // 列数断点对齐网格视图(2/3/4/5/6),但按容器宽度而非视口
  const columnCount = computed(() => {
    const w = containerWidth.value
    if (w <= 0) return 2
    if (w < 640) return 2
    if (w < 768) return 3
    if (w < 1024) return 4
    if (w < 1280) return 5
    return 6
  })

  const columns = computed<AIGCImage[][]>(() => {
    const count = columnCount.value
    const cols: AIGCImage[][] = Array.from({ length: count }, () => [])
    const heights = new Array(count).fill(0)

    for (const item of items.value) {
      // 缺宽高的旧行(回填前)按方形估算
      const ratio = item.width && item.height ? item.height / item.width : 1
      let shortest = 0
      for (let c = 1; c < count; c++) {
        if (heights[c] < heights[shortest]) shortest = c
      }
      cols[shortest].push(item)
      heights[shortest] += ratio
    }

    return cols
  })

  return { columnCount, columns }
}
