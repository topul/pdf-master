import '@testing-library/jest-dom/vitest'

// jsdom 不实现 matchMedia，部分组件初始化时会调用，补一个空实现
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}

// jsdom 未实现 createObjectURL（部分 hook/组件可能用到）
if (!URL.createObjectURL) {
  URL.createObjectURL = () => 'blob:mock'
  URL.revokeObjectURL = () => {}
}
