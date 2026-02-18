import { watch, type Ref } from 'vue'

/**
 * Lock body scroll when a modal/panel is open and compensate for scrollbar width
 * to prevent layout shift
 */
export function useScrollLock(isOpen: Ref<boolean>) {
  watch(isOpen, (open) => {
    if (open) {
      // Get scrollbar width before hiding it
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

      // Lock scroll
      document.body.style.overflow = 'hidden'

      // Compensate for scrollbar width to prevent layout shift
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`
      }
    } else {
      // Restore scroll
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
  }, { immediate: true })
}
