/**
 * Estratégia de preload para componentes lazy
 * Carrega componentes em background quando o usuário está idle
 */

// Armazena as promises de preload
const preloadedComponents = new Map()

/**
 * Precarrega um componente lazy
 * @param {Function} componentLoader - Função que retorna a promise do import()
 * @param {string} componentName - Nome do componente para cache
 */
export const preloadComponent = (componentLoader, componentName) => {
  if (!preloadedComponents.has(componentName)) {
    const promise = componentLoader()
    preloadedComponents.set(componentName, promise)
    return promise
  }
  return preloadedComponents.get(componentName)
}

/**
 * Precarrega múltiplos componentes
 * @param {Array} components - Array de {loader, name}
 */
export const preloadComponents = (components) => {
  // Aguarda idle time para não atrapalhar carregamento inicial
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      components.forEach(({ loader, name }) => {
        preloadComponent(loader, name)
      })
    })
  } else {
    // Fallback para navegadores sem requestIdleCallback
    setTimeout(() => {
      components.forEach(({ loader, name }) => {
        preloadComponent(loader, name)
      })
    }, 1000)
  }
}

/**
 * Precarrega componente ao hover (para navegação mais rápida)
 */
export const createPreloadOnHover = (componentLoader, componentName) => {
  return () => preloadComponent(componentLoader, componentName)
}
