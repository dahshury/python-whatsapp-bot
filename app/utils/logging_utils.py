import datetime
import logging
from zoneinfo import ZoneInfo

from app.config import config


def log_http_response(response):
    try:
        status = response.status_code
        ctype = response.headers.get("content-type")
        body = response.text
        # Only emit INFO on non-2xx; otherwise DEBUG to reduce noise
        if int(status) >= 400:
            logging.error(f"Status: {status}")
            logging.error(f"Content-type: {ctype}")
            logging.error(f"Body: {body}")
        else:
            logging.debug(f"Status: {status}")
            logging.debug(f"Content-type: {ctype}")
            logging.debug(f"Body: {body}")
    except Exception:
        # Best-effort fallback to avoid crashing logging path
        logging.debug("log_http_response encountered an exception while formatting response")


def _truncate_middle(text: str, max_len: int) -> str:
    if not isinstance(text, str):
        try:
            text = str(text)
        except Exception:
            return "-"
    if max_len <= 1 or len(text) <= max_len:
        return text
    # Keep prefix and add ellipsis at end to avoid breaking table borders
    return text[: max_len - 1] + "…"


def _format_ascii_table(headers, rows, max_widths=None) -> str:
    """
    Build a simple ASCII table given headers and row values.
    headers: list[str]
    rows: list[list[str]]
    max_widths: optional dict of header->int to cap column widths
    """
    # Determine column widths
    widths = {h: len(h) for h in headers}
    for row in rows:
        for h, cell in zip(headers, row, strict=False):
            cell_str = str(cell)
            cap = (max_widths or {}).get(h)
            eff = len(cell_str) if not cap else min(len(cell_str), cap)
            widths[h] = max(widths[h], eff)

    # Apply caps to header widths too
    if max_widths:
        for h in headers:
            widths[h] = min(widths[h], max_widths.get(h, widths[h]))

    def sep() -> str:
        parts = ["+"]
        for h in headers:
            parts.append("-" * (widths[h] + 2))
            parts.append("+")
        return "".join(parts)

    def fmt_row(vals) -> str:
        out = ["|"]
        for h, v in zip(headers, vals, strict=False):
            s = str(v)
            cap = (max_widths or {}).get(h)
            if cap:
                s = _truncate_middle(s, cap)
            out.append(" " + s.ljust(widths[h]) + " ")
            out.append("|")
        return "".join(out)

    lines = [sep(), fmt_row(headers), sep()]
    for r in rows:
        lines.append(fmt_row(r))
    lines.append(sep())
    return "\n".join(lines)


def format_whatsapp_status_table(body) -> str | None:
    """
    Create an ASCII table for WhatsApp status updates with per-status rows.
    Columns: status, message_id, account, phone, timestamp (local TZ).
    Returns a multi-line string or None on failure.
    """
    try:
        entry = (body or {}).get("entry", [{}])[0]
        account = entry.get("id") or "-"
        value = (entry.get("changes", [{}])[0] or {}).get("value", {})
        meta = value.get("metadata", {}) if isinstance(value, dict) else {}
        phone = meta.get("display_phone_number") or "-"
        statuses = value.get("statuses", []) if isinstance(value, dict) else []
        if not isinstance(statuses, list) or not statuses:
            return None

        tz_name = config.get("TIMEZONE") or "UTC"
        try:
            tz = ZoneInfo(str(tz_name))
        except Exception:
            tz = ZoneInfo("UTC")

        headers = ["status", "message_id", "account", "phone", "timestamp"]
        rows = []
        for st in statuses:
            if not isinstance(st, dict):
                continue
            s_status = st.get("status") or "-"
            msg_id = st.get("id") or st.get("message_id") or "-"
            ts_raw = st.get("timestamp")
            ts_str = "-"
            try:
                if ts_raw is not None:
                    # WhatsApp sends epoch seconds as string
                    ts = datetime.datetime.fromtimestamp(int(ts_raw), tz=tz)
                    ts_str = ts.strftime("%Y-%m-%d %H:%M:%S")
            except Exception:
                ts_str = "-"
            rows.append([s_status, str(msg_id), str(account), str(phone), ts_str])

        # Cap widths to keep log compact
        max_widths = {
            "status": 10,
            "message_id": 26,
            "account": 18,
            "phone": 18,
            "timestamp": 19,
        }
        return _format_ascii_table(headers, rows, max_widths)
    except Exception as e:
        logging.debug(f"Failed to format WhatsApp status table: {e}")
        return None
