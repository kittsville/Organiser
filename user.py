import web
import uuid
import base64
import binascii
import json
import time

from cryptography.fernet import Fernet
from redis.client import Redis

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
                raise web.badrequest('Invalid encryption key')

            return UserKey(uuid.UUID(bytes=uuid_bytes, version=4), encryption_key)
        except (ValueError, binascii.Error) as e:
            raise web.badrequest(f'Invalid user key: {e}')

    def base64_uuid(self):
        return base64.urlsafe_b64encode(self.uuid.bytes).decode('utf8').rstrip('=\n')

    def base64_encrpytion_key(self):
        return self.encryption_key.decode('utf8').rstrip('=\n')

class User:
    STATE_VERSION = 1
    STATE_EDITED_EXPIRY_SECONDS = 180 * 24 * 60 * 60
    STATE_UNEDITED_EXPIRY_SECONDS = 30 * 24 * 60 * 60

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
                    '!!Prevent Item Getting Removed',
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


    def __init__(self, r: "Redis[bytes]", user_key: UserKey):
        self.r = r
        self.key = user_key
        self.redis_key = f'Organiser:{user_key.uuid}'

    def setup_first_activities(self):
        raw_state           = json.dumps(User.genDefaultState())
        encrypted_raw_state = self.key.fernet.encrypt(raw_state.encode())
        success             = self.r.setex(self.redis_key, User.STATE_UNEDITED_EXPIRY_SECONDS, encrypted_raw_state)

        if not success:
            raise web.internalerror()

    def get_activities(self):
        encrypted_user_data = self.r.get(self.redis_key)

        if encrypted_user_data is None:
            raise web.notfound()

        raw_user_data = self.key.fernet.decrypt(encrypted_user_data)
        user_data = json.loads(raw_user_data)

        if not 'unedited' in user_data:
            self.r.expire(self.redis_key, User.STATE_EDITED_EXPIRY_SECONDS)

        return raw_user_data

    def update_activities(self, raw_body: str):
        if len(raw_body) > 20000:
            return web.badrequest('List of activities too large')

        parsed_body = json.loads(raw_body)

        encrypted_previous_user_data = self.r.get(self.redis_key)

        if encrypted_previous_user_data is None:
            raise web.notfound()

        raw_previous_user_data = self.key.fernet.decrypt(encrypted_previous_user_data)
        previous_state = json.loads(raw_previous_user_data)

        if parsed_body['previousUpdatedAt'] != previous_state['updatedAt']:
            raise web.badrequest('List of activities has since been updated, please reload')

        state = {
            'updatedAt': time.time(),
            'version': User.STATE_VERSION,
            'activities': parsed_body['activities']
        }

        raw_state = json.dumps(state)

        encrypted_raw_state = self.key.fernet.encrypt(raw_state.encode())

        success = self.r.setex(self.redis_key, User.STATE_EDITED_EXPIRY_SECONDS, encrypted_raw_state)

        if success:
            return raw_state
        else:
            return web.internalerror()
