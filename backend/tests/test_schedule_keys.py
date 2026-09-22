from app.utils.day_keys import normalize_day_keys, CANONICAL_DAYS


def test_localized_keys_map_onto_english_days():
    raw = {
        "الاثنين": [{"task": "ریاضی"}],
        "سێشەممە": [],
        "الأربعاء": [{"task": "علوم"}],
        "پێنجشەممە": [],
        "الجمعة": [],
        "شەممە": [],
        "یەکشەممە": [],
    }
    result = normalize_day_keys(raw)
    assert list(result.keys()) == CANONICAL_DAYS
    assert result["Monday"] == [{"task": "ریاضی"}]
    assert result["Tuesday"] == []
    assert result["Wednesday"] == [{"task": "علوم"}]
    assert result["Sunday"] == []


def test_english_passthrough_unchanged():
    raw = {
        "Monday": [{"task": "A"}],
        "Tuesday": [],
        "Wednesday": [],
        "Thursday": [],
        "Friday": [],
        "Saturday": [],
        "Sunday": [{"task": "B"}],
    }
    result = normalize_day_keys(raw)
    assert result == raw


def test_garbage_keys_are_ignored_and_all_days_present():
    raw = {
        "foobar": [{"task": "junk"}],
        "explanation": "a long blob",
        "Mondey": [{"task": "typo"}],
    }
    result = normalize_day_keys(raw)
    assert set(result.keys()) == set(CANONICAL_DAYS)
    assert all(result[day] == [] for day in CANONICAL_DAYS)


def test_latin_and_cjk_alias_forms():
    result = normalize_day_keys({"mon": [], "tue": [], "sali": [], "星期二": []})
    assert result["Monday"] == []
    assert result["Tuesday"] == []
    assert result["Friday"] == []


def test_single_object_value_is_wrapped_in_list():
    result = normalize_day_keys({"Monday": {"task": "single"}})
    assert result["Monday"] == [{"task": "single"}]