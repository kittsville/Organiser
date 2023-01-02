import json
import time
import uuid

class User:
    STATE_VERSION = 1

    @staticmethod
    def genDefaultState():
        return {
        'updatedAt': time.time(),
        'version': User.STATE_VERSION,
        'lists': [
            {
                'name': 'Partying',
                'id': str(uuid.uuid4()),
                'items': [
                    'Booze',
                    'Phone Charger',
                    'Oyster Card'
                ]
            },
            {
                'name': 'Sleeping Over',
                'id': str(uuid.uuid4()),
                'items': [
                    'Toothbrush',
                    'Hair tie',
                    'Comb',
                    'Progesterone'
                ]
            },
            {
                'name': 'Bike Trip',
                'id': str(uuid.uuid4()),
                'items': [
                    'Flapjacks',
                    'Sandwich',
                    '2 x Water bottle',
                    'Wallet',
                    'Check tyre pressure',
                    'Keys',
                    'Jumper',
                    'Rain jacket',
                    'GT85',
                    'Bike Multitool'
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
