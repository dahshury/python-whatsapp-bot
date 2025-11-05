import type { ReservationRepository } from "@/entities/reservation/core/reservation.repository";
import type {
  CancelReservationCommand,
  ModifyReservationCommand,
} from "@/entities/reservation/types";

export class ReservationService {
  private readonly repo: ReservationRepository;

  constructor(repo: ReservationRepository) {
    this.repo = repo;
  }

  modify(cmd: ModifyReservationCommand) {
    return this.repo.modify(cmd);
  }

  cancel(cmd: CancelReservationCommand) {
    return this.repo.cancel(cmd);
  }
}
