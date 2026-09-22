"""Canonical English weekday keys for the AI schedule payloads.

The AI route is told to "respond in Kurdish/Arabic". Some models then also
translate the JSON *keys* (e.g. ``"الاثنين"`` or ``"دووشەممە"``), but the app and
the ``DaySchedule`` model only understand ``Monday…Sunday``, so those days would
silently vanish. This module recovers the canonical English keys on ingest.
"""

CANONICAL_DAYS = [
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
]

# Curated best-effort aliases (localized weekdays -> canonical day).
# Keys are folded with _fold() before lookup.
_DAY_ALIASES: dict[str, str] = {
    # English full + short forms
    "monday": "Monday", "mon": "Monday",
    "tuesday": "Tuesday", "tue": "Tuesday",
    "wednesday": "Wednesday", "wed": "Wednesday",
    "thursday": "Thursday", "thu": "Thursday",
    "friday": "Friday", "fri": "Friday",
    "saturday": "Saturday", "sat": "Saturday",
    "sunday": "Sunday", "sun": "Sunday",

    # Arabic
    "الاثنين": "Monday", "الأثنين": "Monday", "الاثــنين": "Monday",
    "الثلاثاء": "Tuesday", "الثلاثـاء": "Tuesday",
    "الأربعاء": "Wednesday", "الاربعاء": "Wednesday",
    "الخميس": "Thursday",
    "الجمعة": "Friday", "الجمعه": "Friday",
    "السبت": "Saturday",
    "الأحد": "Sunday", "الاحد": "Sunday",

    # Kurdish (Sorani / Kurmanji, Arabic script)
    "دووشەممە": "Monday", "دوشەممە": "Monday",
    "سێشەممە": "Tuesday", "سێشەمبە": "Tuesday",
    "چوارشەممە": "Wednesday", "چوارشەمبە": "Wednesday",
    "پێنجشەممە": "Thursday", "پێنجشەمبە": "Thursday",
    "هەینی": "Friday", "هاینی": "Friday",
    "شەممە": "Saturday", "شەمبە": "Saturday",
    "یەکشەممە": "Sunday", "یکشەممە": "Sunday", "يەکشەممە": "Sunday",

    # Persian / Dari
    "دوشنبه": "Monday", "دوشنبه‌": "Monday",
    "سه‌شنبه": "Tuesday", "سهشنبه": "Tuesday",
    "چهارشنبه": "Wednesday",
    "پنجشنبه": "Thursday", "پنج‌شنبه": "Thursday",
    "جمعه": "Friday",
    "شنبه": "Saturday",
    "یکشنبه": "Sunday", "یک‌شنبه": "Sunday", "يکشنبه": "Sunday",

    # Turkish / Sorani-Latin
    "pazartesi": "Monday", "sali": "Tuesday",
    "carsamba": "Wednesday", "persembe": "Thursday",
    "cuma": "Friday", "cumartesi": "Saturday", "pazar": "Sunday",

    # Russian (Cyrillic)
    "понедельник": "Monday",
    "вторник": "Tuesday",
    "среда": "Wednesday",
    "четверг": "Thursday",
    "пятница": "Friday",
    "суббота": "Saturday",
    "воскресенье": "Sunday",

    # CJK best-effort
    "星期一": "Monday", "周一": "Monday", "礼拜一": "Monday",
    "星期二": "Tuesday", "周二": "Tuesday", "礼拜二": "Tuesday",
    "星期三": "Wednesday", "周三": "Wednesday", "礼拜三": "Wednesday",
    "星期四": "Thursday", "周四": "Thursday", "礼拜四": "Thursday",
    "星期五": "Friday", "周五": "Friday", "礼拜五": "Friday",
    "星期六": "Saturday", "周六": "Saturday", "礼拜六": "Saturday",
    "星期日": "Sunday", "星期天": "Sunday", "周日": "Sunday", "礼拜日": "Sunday",
}


def _fold(key: str) -> str:
    """Normalize a key for lookup: strip whitespace and lower-case Latin/Cyrillic."""
    return key.strip().replace(" ", "").lower()


def normalize_day_keys(raw: dict) -> dict:
    """Return a dict containing exactly the 7 canonical English day keys.

    English keys pass through unchanged; localized spellings are mapped onto
    their English day; unknown keys are dropped; missing days default to an
    empty list (so the app never loses a day to a translated key).
    """
    if not isinstance(raw, dict):
        return {day: [] for day in CANONICAL_DAYS}

    mapped: dict[str, list] = {day: [] for day in CANONICAL_DAYS}
    for key, value in raw.items():
        canonical = _DAY_ALIASES.get(_fold(key))
        if canonical is None:
            continue  # drop garbage keys (including explanation blobs)
        raw_value = value if isinstance(value, list) else (
            [value] if value is not None else []
        )
        mapped[canonical] = raw_value
    return mapped