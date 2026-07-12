import base64
import binascii
import json
import time
import uuid

from cryptography.fernet import Fernet
from flask import abort
from psycopg2.extensions import connection as Connection


class UserKey:
    def __init__(self, user_uuid: uuid.UUID, encryption_key: bytes):
        self.uuid = user_uuid
        self.fernet = Fernet(encryption_key)
        self.encryption_key = encryption_key

    @staticmethod
    def random():
        return UserKey(uuid.uuid4(), Fernet.generate_key())

    @staticmethod
    def from_base64_strings(uuid_base64, raw_encryption_key):
        try:
            uuid_base64_padded = f'{uuid_base64}=='
            uuid_bytes = base64.urlsafe_b64decode(uuid_base64_padded)

            encryption_key = f'{raw_encryption_key}='.encode('utf8')

            if len(encryption_key) != 44:
                abort(400, description='Invalid encryption key')

            return UserKey(uuid.UUID(bytes=uuid_bytes, version=4), encryption_key)
        except (ValueError, binascii.Error) as e:
            abort(400, description=f'Invalid user key: {e}')

    def base64_uuid(self):
        return base64.urlsafe_b64encode(self.uuid.bytes).decode('utf8').rstrip('=\n')

    def base64_encrpytion_key(self):
        return self.encryption_key.decode('utf8').rstrip('=\n')


class User:
    STATE_TABLE_NAME = 'user_state'
    STATE_VERSION = 1
    STATE_EDITED_EXPIRY_SQL = "NOW() + INTERVAL '180 DAYS'"
    STATE_UNEDITED_EXPIRY_SQL = "NOW() + INTERVAL '30 DAYS'"

    @staticmethod
    def genDefaultState():
        return {
        'updatedAt': time.time(),
        'version': User.STATE_VERSION,
        'unedited': True,
        'activities': [
            {
                'name': 'Example Activities',
                'items': [
                    'Regular Item',
                    'Optional Item?'
                ]
            },
            {
                'name': 'Advanced Stuff',
                'items': [
                    '-Remove Item',
                    'Prevent Item Getting Removed!!',
                    '~Reference Another Activity'
                ]
            },
            {
                'name': 'Reference Another Activity',
                'items': [
                    'Using the tilde ~ symbol',
                    'See example in Advanced Stuff'
                ]
            }
        ]
    }


    def __init__(self, db: Connection, user_key: UserKey):
        self.db = db
        self.key = user_key

    def __get_raw_user_data(self):
        with self.db.cursor() as cur:
            cur.execute(
                f'SELECT encrypted_raw_state FROM {User.STATE_TABLE_NAME} WHERE uuid = %s',
                (self.key.uuid,),
            )
            result = cur.fetchone()

        if result is None:
            abort(404)

        encrypted_user_data = bytes(result['encrypted_raw_state'])
        return self.key.fernet.decrypt(encrypted_user_data)

    def setup_first_activities(self):
        raw_state = json.dumps(User.genDefaultState())
        encrypted_raw_state = self.key.fernet.encrypt(raw_state.encode())

        with self.db.cursor() as cur:
            cur.execute(
                f'INSERT INTO {User.STATE_TABLE_NAME} '
                f'(uuid, encrypted_raw_state, expires) '
                f'VALUES (%s, %s, {User.STATE_UNEDITED_EXPIRY_SQL})',
                (self.key.uuid, encrypted_raw_state),
            )
            success = cur.rowcount
        self.db.commit()

        if not success:
            abort(500, description="Failed to create user with default activities")

    def get_activities(self):
        raw_user_data = self.__get_raw_user_data()
        user_data = json.loads(raw_user_data)

        if 'unedited' not in user_data:
            with self.db.cursor() as cur:
                cur.execute(
                    f'UPDATE {User.STATE_TABLE_NAME} '
                    f'SET expires = {User.STATE_EDITED_EXPIRY_SQL} '
                    f'WHERE uuid = %s',
                    (self.key.uuid,),
                )
            self.db.commit()

        return raw_user_data

    def update_activities(self, raw_body: bytes):
        if len(raw_body) > 20000:
            abort(400, description='List of activities too large')

        parsed_body = json.loads(raw_body)

        raw_previous_user_data = self.__get_raw_user_data()
        previous_state = json.loads(raw_previous_user_data)

        if parsed_body['previousUpdatedAt'] != previous_state['updatedAt']:
            abort(400, description='List of activities has since been updated, please reload')

        state = {
            'updatedAt': time.time(),
            'version': User.STATE_VERSION,
            'activities': parsed_body['activities']
        }

        raw_state = json.dumps(state)
        encrypted_raw_state = self.key.fernet.encrypt(raw_state.encode())

        with self.db.cursor() as cur:
            cur.execute(
                f'UPDATE {User.STATE_TABLE_NAME} '
                f'SET encrypted_raw_state = %s, expires = {User.STATE_EDITED_EXPIRY_SQL} '
                f'WHERE uuid = %s',
                (encrypted_raw_state, self.key.uuid),
            )
            success = cur.rowcount
        self.db.commit()

        if success:
            return raw_state
        else:
            abort(500)
