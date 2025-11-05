export function createSelectAllow(
  isVacationDate?: (dateStr: string) => boolean
) {
  return (info: { startStr?: string; endStr?: string }) => {
    try {
      const startStr: string | undefined = info?.startStr;
      const endStr: string | undefined = info?.endStr;
      if (!(startStr && endStr)) {
        return true;
      }
      const start = new Date(startStr);
      const end = new Date(endStr);
      const cur = new Date(start);
      while (cur < end) {
        const yyyy = cur.getFullYear();
        const mm = String(cur.getMonth() + 1).padStart(2, "0");
        const dd = String(cur.getDate()).padStart(2, "0");
        const dateOnly = `${yyyy}-${mm}-${dd}`;
        if (isVacationDate?.(dateOnly)) {
          return false;
        }
        cur.setDate(cur.getDate() + 1);
      }
    } catch {
      // Ignore date parsing errors and allow selection
    }
    return true;
  };
}

export function createEventAllow(
  isVacationDate?: (dateStr: string) => boolean
) {
  return (info: { start?: Date; end?: Date }) => {
    try {
      if (!isVacationDate) {
        return true;
      }
      const start = info?.start ? new Date(info.start) : null;
      const end = info?.end ? new Date(info.end) : null;
      if (!start) {
        return true;
      }
      const cursor = new Date(start);
      while (true) {
        const y = cursor.getFullYear();
        const m = String(cursor.getMonth() + 1).padStart(2, "0");
        const d = String(cursor.getDate()).padStart(2, "0");
        const ymd = `${y}-${m}-${d}`;
        if (isVacationDate(ymd)) {
          return false;
        }
        if (!end) {
          break;
        }
        const next = new Date(cursor);
        next.setDate(next.getDate() + 1);
        if (next >= end) {
          break;
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    } catch {
      // Ignore date parsing errors and allow event
    }
    return true;
  };
}
