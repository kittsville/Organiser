import web
import json
import time

class User:
    STATE_VERSION = 1
    STATE_EXPIRY_SECONDS = 30 * 24 * 60 * 60

    @staticmethod
    def genDefaultState():
        return {
        'updatedAt': time.time(),
        'version': User.STATE_VERSION,
        'lists': [
            {
                'name': 'Partying',
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
            },
            {
                'name': 'Bike Trip',
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
    
    def save_lists(self, r, raw_body):
        if len(raw_body) > 20000:
            return web.badrequest('List of activities too large')
        
        parsed_body = json.loads(raw_body)

        state = {
            'updatedAt': time.time(),
            'version': User.STATE_VERSION,
            'lists': parsed_body
        }

        raw_state = json.dumps(state)

        success = r.setex(self.redis_key, User.STATE_EXPIRY_SECONDS, raw_state)

        if success:
            return raw_state
        else:
            return web.internalerror()
