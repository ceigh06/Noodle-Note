import { QueryClient } from '@tanstack/react-query'
import { createRouter, createHashHistory } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

const hashHistory = createHashHistory()

const routerOptions = {
  routeTree,
  context: { queryClient: new QueryClient() },
  scrollRestoration: true,
  defaultPreloadStaleTime: 0,
  history: hashHistory
}

export const getRouter = (): ReturnType<typeof createRouter> => createRouter(routerOptions)

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
