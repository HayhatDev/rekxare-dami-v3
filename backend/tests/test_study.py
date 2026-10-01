import pytest

from app.routes.study import (
    StudyData,
    MAX_REVIEW_CARDS,
    MAX_SESSION_LOG,
    _is_review_card,
)


def make_card(**overrides):
    card = {
        "id": "math:1q2kpfd",
        "deck_id": "math:2026-09-02",
        "subject": "Math",
        "question": "What is 2 + 2?",
        "options": ["4", "5", "3", "6"],
        "correct": 0,
        "explanation": "Basic addition.",
        "ease": 2.5,
        "interval_days": 0,
        "due_at": "2026-09-02T10:00:00.000Z",
        "reps": 0,
        "lapses": 0,
        "created_at": "2026-09-02T10:00:00.000Z",
    }
    card.update(overrides)
    return card


def test_defaults_include_empty_collections():
    payload = StudyData().model_dump()
    assert payload["session_log"] == []
    assert payload["review_cards"] == []


def test_session_log_round_trips_verbatim():
    log = [{"id": "a", "subject": "Math", "completed": True, "quiz_score": 80}]
    payload = StudyData(session_log=log).model_dump()
    assert payload["session_log"] == log


def test_review_cards_round_trip_verbatim():
    cards = [make_card(), make_card(id="math:2", reps=3, interval_days=10)]
    payload = StudyData(review_cards=cards).model_dump()
    assert payload["review_cards"] == cards


def test_review_history_fields_are_not_dropped():
    payload = StudyData(review_cards=[make_card(reps=4, ease=2.65)]).model_dump()
    card = payload["review_cards"][0]
    assert card["reps"] == 4
    assert card["ease"] == 2.65
    assert card["due_at"] == "2026-09-02T10:00:00.000Z"


def test_session_log_is_capped():
    log = [{"id": str(i)} for i in range(MAX_SESSION_LOG + 50)]
    payload = StudyData(session_log=log).model_dump()
    assert len(payload["session_log"]) == MAX_SESSION_LOG


def test_review_cards_are_capped():
    cards = [make_card(id=f"c{i}") for i in range(MAX_REVIEW_CARDS + 50)]
    payload = StudyData(review_cards=cards).model_dump()
    assert len(payload["review_cards"]) == MAX_REVIEW_CARDS


@pytest.mark.parametrize(
    "bad",
    [
        {"question": "q", "correct": 0, "options": []},
        {"id": "", "question": "q", "correct": 0, "options": []},
        {"id": "a", "correct": 0, "options": []},
        {"id": "a", "question": "q", "options": []},
        {"id": "a", "question": "q", "correct": 0},
        {"id": "a", "question": 5, "correct": 0, "options": []},
        "not-a-dict",
        None,
        42,
    ],
)
def test_malformed_cards_are_stripped(bad):
    assert not _is_review_card(bad)


def test_malformed_cards_do_not_poison_a_valid_collection():
    payload = StudyData(
        review_cards=[make_card(), {"id": "bad"}, None, make_card(id="ok")]
    ).model_dump()
    assert [c["id"] for c in payload["review_cards"]] == ["math:1q2kpfd", "ok"]


def test_valid_card_passes_validation():
    assert _is_review_card(make_card())


def test_empty_collections_survive_a_full_round_trip():
    original = StudyData(total_seconds=120, xp_points=45, session_log=[])
    restored = StudyData(**original.model_dump())
    assert restored.model_dump() == original.model_dump()