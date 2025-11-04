export * from './useNavigationView'

import { createNavigationService } from '../services/navigation.service.factory'
import { createUseNavigationView } from './useNavigationView'

const nav = createNavigationService()
export const useNavigationView = createUseNavigationView(nav)

// Export additional hooks
export { useCtrlViewSwitch } from './use-ctrl-view-switch'
export { useDockNavigation } from './use-dock-navigation'
