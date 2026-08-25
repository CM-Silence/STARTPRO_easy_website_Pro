// 带幕布转场的导航：Cover 组件注册它的「先盖幕布→再导航」实现，其它需要转场的程序化导航（如语言切换器）调用它。
// 返回 true 表示已交给幕布处理；返回 false 表示幕布不可用/未就绪，调用方应回退为直接 router.push。

type NavImpl = (href: string) => boolean
let impl: NavImpl | null = null

export function registerTransitionNavigator(fn: NavImpl): () => void {
  impl = fn
  return () => {
    if (impl === fn) impl = null
  }
}

export function coveredNavigate(href: string): boolean {
  return impl ? impl(href) : false
}