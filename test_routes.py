import json
from unittest.mock import MagicMock, patch

import pytest

from user import User, UserKey


SAMPLE_STATE = {
    'updatedAt': 1234567890.0,
    'version': 1,
    'unedited': True,
    'activities': [
        {
            'name': 'Example Activities',
            'items': ['Regular Item', 'Optional Item?'],
        },
    ],
}


@pytest.fixture
def user_key():
    return UserKey.random()


@pytest.fixture
def flask_app():
    import app as app_module
    app_module.app.config['TESTING'] = True
    yield app_module.app


@pytest.fixture
def client(flask_app):
    return flask_app.test_client()


def test_homepage(client):
    response = client.get('/')
    assert response.status_code == 200
    assert b'Organiser' in response.data
    assert b'Create Encrypted User' in response.data


def test_not_found(client):
    response = client.get('/not-a-valid-user-id!!')
    assert response.status_code == 404
    assert b'404' in response.data


def test_health(client):
    mock_db = MagicMock()
    mock_cursor = MagicMock()
    mock_db.cursor.return_value.__enter__.return_value = mock_cursor

    with patch('app.get_db', return_value=mock_db):
        response = client.get('/health')

    assert response.status_code == 200
    mock_cursor.execute.assert_called_once_with(
        "DELETE FROM user_state WHERE expires < NOW()"
    )
    mock_db.commit.assert_called_once()


def test_new_user_redirects(client, user_key):
    mock_db = MagicMock()

    with patch('app.UserKey.random', return_value=user_key), \
         patch('app.get_db', return_value=mock_db), \
         patch('app.User') as mock_user_cls:
        mock_user = MagicMock()
        mock_user_cls.return_value = mock_user
        response = client.get('/new')

    assert response.status_code == 302
    assert response.location.startswith(f'/{user_key.base64_uuid()}?key=')
    assert user_key.base64_encrpytion_key() in response.location
    mock_user.setup_first_activities.assert_called_once()
    mock_user_cls.assert_called_once_with(mock_db, user_key)


def test_activities_page(client, user_key):
    response = client.get(
        f'/{user_key.base64_uuid()}?key={user_key.base64_encrpytion_key()}'
    )
    assert response.status_code == 200
    assert str(user_key.uuid).encode() in response.data


def test_activities_invalid_key(client, user_key):
    response = client.get(f'/{user_key.base64_uuid()}?key=not-a-valid-key')
    assert response.status_code == 400


def test_api_get_activities(client, user_key):
    encrypted = user_key.fernet.encrypt(json.dumps(SAMPLE_STATE).encode())
    mock_db = MagicMock()
    mock_cursor = MagicMock()
    mock_cursor.fetchone.return_value = {'encrypted_raw_state': encrypted}
    mock_db.cursor.return_value.__enter__.return_value = mock_cursor

    with patch('app.get_db', return_value=mock_db):
        response = client.get(
            f'/api/activities/{user_key.base64_uuid()}'
            f'?key={user_key.base64_encrpytion_key()}'
        )

    assert response.status_code == 200
    assert json.loads(response.data)['activities'][0]['name'] == 'Example Activities'


def test_api_get_activities_not_found(client, user_key):
    mock_db = MagicMock()
    mock_cursor = MagicMock()
    mock_cursor.fetchone.return_value = None
    mock_db.cursor.return_value.__enter__.return_value = mock_cursor

    with patch('app.get_db', return_value=mock_db):
        response = client.get(
            f'/api/activities/{user_key.base64_uuid()}'
            f'?key={user_key.base64_encrpytion_key()}'
        )

    assert response.status_code == 404


def test_api_update_activities(client, user_key):
    encrypted = user_key.fernet.encrypt(json.dumps(SAMPLE_STATE).encode())
    mock_db = MagicMock()
    mock_cursor = MagicMock()
    mock_cursor.fetchone.return_value = {'encrypted_raw_state': encrypted}
    mock_cursor.rowcount = 1
    mock_db.cursor.return_value.__enter__.return_value = mock_cursor

    payload = {
        'previousUpdatedAt': SAMPLE_STATE['updatedAt'],
        'activities': [{'name': 'Updated', 'items': ['One', 'Two']}],
    }

    with patch('app.get_db', return_value=mock_db):
        response = client.post(
            f'/api/activities/{user_key.base64_uuid()}'
            f'?key={user_key.base64_encrpytion_key()}',
            data=json.dumps(payload),
        )

    assert response.status_code == 200
    body = json.loads(response.data)
    assert body['activities'][0]['name'] == 'Updated'
    assert 'unedited' not in body


def test_api_update_stale(client, user_key):
    encrypted = user_key.fernet.encrypt(json.dumps(SAMPLE_STATE).encode())
    mock_db = MagicMock()
    mock_cursor = MagicMock()
    mock_cursor.fetchone.return_value = {'encrypted_raw_state': encrypted}
    mock_db.cursor.return_value.__enter__.return_value = mock_cursor

    payload = {
        'previousUpdatedAt': 0,
        'activities': [{'name': 'Updated', 'items': ['One', 'Two']}],
    }

    with patch('app.get_db', return_value=mock_db):
        response = client.post(
            f'/api/activities/{user_key.base64_uuid()}'
            f'?key={user_key.base64_encrpytion_key()}',
            data=json.dumps(payload),
        )

    assert response.status_code == 400
    assert b'since been updated' in response.data


def test_user_key_roundtrip(user_key):
    restored = UserKey.from_base64_strings(
        user_key.base64_uuid(),
        user_key.base64_encrpytion_key(),
    )
    assert restored.uuid == user_key.uuid
    assert restored.encryption_key == user_key.encryption_key


def test_gen_default_state():
    state = User.genDefaultState()
    assert state['version'] == 1
    assert state['unedited'] is True
    assert len(state['activities']) >= 1
