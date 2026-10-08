import pytest

from app.routes import account


@pytest.fixture(autouse=True)
def _env(monkeypatch):
    monkeypatch.setattr(account, "SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setattr(account, "SUPABASE_SERVICE_ROLE_KEY", "service-role-test")
    monkeypatch.setattr(account, "SUPABASE_KEY", "anon-key-test")


@pytest.mark.asyncio
async def test_purge_user_data_deletes_rows_from_every_table(monkeypatch):
    calls: list[tuple[str, str]] = []

    async def fake_request(method: str, path: str, data=None, headers=None):
        calls.append((method, path))

    monkeypatch.setattr(account, "supabase_request", fake_request)

    purged, failed = await account._purge_user_data("user-123")

    assert purged == ["study_data", "user_prefs", "schedules"]
    assert failed == []
    assert calls == [
        ("DELETE", "study_data?user_key=eq.user-123"),
        ("DELETE", "user_prefs?user_key=eq.user-123"),
        ("DELETE", "schedules?user_key=eq.user-123"),
    ]


@pytest.mark.asyncio
async def test_purge_user_data_keeps_going_when_a_table_delete_fails(monkeypatch):
    async def fake_request(method: str, path: str, data=None, headers=None):
        if "user_prefs" in path:
            raise RuntimeError("boom")

    monkeypatch.setattr(account, "supabase_request", fake_request)

    purged, failed = await account._purge_user_data("user-123")

    assert "user_prefs" not in purged
    assert "study_data" in purged
    assert "schedules" in purged
    # The failure must be reported, not just logged: the caller decides whether
    # it is safe to call the account deleted.
    assert failed == ["user_prefs"]


class _FakeGoTrueResponse:
    def __init__(self, status_code, text=""):
        self.status_code = status_code
        self.text = text


class _FakeGoTrueClient:
    def __init__(self, captured, response=None, *args, **kwargs):
        self._captured = captured
        self._response = response or _FakeGoTrueResponse(200)

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return False

    async def delete(self, url, headers=None):
        self._captured["url"] = url
        self._captured["headers"] = headers
        return self._response


@pytest.mark.asyncio
async def test_delete_auth_user_uses_admin_api_with_service_role(monkeypatch):
    captured: dict = {}
    monkeypatch.setattr(
        account.httpx,
        "AsyncClient",
        lambda *args, **kwargs: _FakeGoTrueClient(captured),
    )

    await account._delete_auth_user("abc123")

    assert captured["url"] == "https://example.supabase.co/auth/v1/admin/users/abc123"
    assert captured["headers"]["Authorization"] == "Bearer service-role-test"
    assert captured["headers"]["apikey"] == "service-role-test"


@pytest.mark.asyncio
async def test_delete_auth_user_raises_on_admin_api_failure(monkeypatch):
    monkeypatch.setattr(
        account.httpx,
        "AsyncClient",
        lambda *args, **kwargs: _FakeGoTrueClient(
            {}, response=_FakeGoTrueResponse(500, "oops")
        ),
    )

    with pytest.raises(RuntimeError):
        await account._delete_auth_user("abc123")

@pytest.mark.asyncio
async def test_delete_account_refuses_to_report_success_after_a_partial_purge(monkeypatch):
    """A partial purge must not be reported as a deleted account.

    Deleting the auth user anyway would strand the surviving rows: the student
    would be locked out with no way to retry, while being told their data was
    gone. The endpoint has to fail so the account stays usable.
    """
    gotrue_deleted: list[str] = []

    async def fake_request(method: str, path: str, data=None, headers=None):
        if "user_prefs" in path:
            raise RuntimeError("boom")

    async def fake_delete_auth_user(user_id: str) -> None:
        gotrue_deleted.append(user_id)

    monkeypatch.setattr(account, "supabase_request", fake_request)
    monkeypatch.setattr(account, "_delete_auth_user", fake_delete_auth_user)

    with pytest.raises(account.HTTPException) as exc:
        await account.delete_account.__wrapped__(None, {"sub": "user-123"})

    assert exc.value.status_code == 502
    assert "user_prefs" in exc.value.detail
    # The account must survive so the deletion can be retried.
    assert gotrue_deleted == []


@pytest.mark.asyncio
async def test_delete_account_succeeds_and_reports_purged_tables(monkeypatch):
    gotrue_deleted: list[str] = []

    async def fake_request(method: str, path: str, data=None, headers=None):
        return None

    async def fake_delete_auth_user(user_id: str) -> None:
        gotrue_deleted.append(user_id)

    monkeypatch.setattr(account, "supabase_request", fake_request)
    monkeypatch.setattr(account, "_delete_auth_user", fake_delete_auth_user)

    result = await account.delete_account.__wrapped__(None, {"sub": "user-123"})

    assert result["status"] == "deleted"
    assert result["purged"] == ["study_data", "user_prefs", "schedules"]
    assert gotrue_deleted == ["user-123"]
