import json

class User:
    DEFAULT_LISTS = [
        {
            'name': 'Party',
            'items': [
                'Booze',
                'Phone Charger',
                'Oyster Card'
            ]
        }
    ]

    def __init__(self, user_uuid):
        self.uuid = user_uuid
        self.redis_key = f'Organiser:{user_uuid}'

    def get_lists(self, r):
        raw_user_data = r.get(self.redis_key)

        if raw_user_data:
            return raw_user_data
        else:
            return json.dumps(User.DEFAULT_LISTS)
