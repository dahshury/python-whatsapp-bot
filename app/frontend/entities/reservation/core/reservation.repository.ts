import type {
  CancelReservationCommand,
  ModifyReservationCommand,
} from "../types";

export type ModifyResult = {
  success: boolean;
  message?: string;
};

export type CancelResult = {
  success: boolean;
  message?: string;
};

export type ReservationRepository = {
  modify(cmd: ModifyReservationCommand): Promise<ModifyResult>;
  cancel(cmd: CancelReservationCommand): Promise<CancelResult>;
};
