import { createReservationsService } from '../services/reservations.service.factory'
import { createUseReservations } from './useReservations'

export const createReservationsHooks = () => ({
	useReservations: createUseReservations(createReservationsService),
})
