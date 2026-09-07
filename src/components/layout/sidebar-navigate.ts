import type { InjectionKey } from 'vue'

/*
 * 「侧栏里的一个导航项被激活了」。AppShell 提供,SidebarItem 调用。
 *
 * 移动端要在导航后自动收起侧栏,但**不能**把这件事挂在 `<aside @click>` 上:
 * FolderPanel / ArtistGroupPanel 的对话框声明在侧栏子树里,点「新建文件夹」会冒泡到
 * aside → `sidebarOpen = false` → aside 的 `v-if` 卸载面板 → 对话框(即使已 teleport)
 * 随所属组件实例一起销毁。结果是 ≤767px 下根本没法新建 / 重命名文件夹与画师分组。
 *
 * 走 inject 而不是 emit,是因为面板都在 `<slot name="sidebar">` 里 —— 逐层往上转发
 * 要改三个面板,漏一个就是一处静默失效的交互。也不靠 `event.target.closest()` 猜:
 * 「我是导航项」是组件自己知道的事,不该从 DOM 反推。
 */
export const SIDEBAR_NAVIGATE: InjectionKey<() => void> = Symbol('sidebar-navigate')
