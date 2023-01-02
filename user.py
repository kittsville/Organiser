import json
import time

class User:
    STATE_VERSION = 1

    @staticmethod
    def genDefaultState():
        return {
        'updatedAt': time.time(),
        'version': User.STATE_VERSION,
        'lists': [
            {
                'name': 'Party',
                'items': [
                    'Booze',
                    'Phone Charger',
                    'Oyster Card'
                ]
            },
            {
                'name': 'Sleeping Over',
                'items': [
                    'Toothbrush',
                    'Hair tie',
                    'Comb',
                    'Progesterone'
                ]
            }
        ]  
    }
    

    def __init__(self, user_uuid):
        self.uuid = user_uuid
        self.redis_key = f'Organiser:{user_uuid}'

    def get_lists(self, r):
        raw_user_data = r.get(self.redis_key)

        if raw_user_data:
            return raw_user_data
        else:
            return json.dumps(User.genDefaultState())
