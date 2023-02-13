import os
import web
import uuid
import binascii
import base64
import redis
import time

from user import User

def parseUUID(base64_encoded_uuid):
    try:
        padded_base64 = f'{base64_encoded_uuid}=='
        decoded_bytes = base64.urlsafe_b64decode(padded_base64)

        return uuid.UUID(bytes=decoded_bytes, version=4)
    except (ValueError, binascii.Error):
        raise web.badrequest('Invalid UUID')

def encodeUUID(u):
    return base64.urlsafe_b64encode(u.bytes).decode('utf8').rstrip('=\n')

urls = (
    '/activities/(.+)', 'api',
    '/health', 'health',
    '/([0-9a-zA-Z\-\_]{22}){0,1}', 'homepage'
)
cacheBust   = int(time.time())
render      = web.template.render('templates/')
app         = web.application(urls, globals())

redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
r = redis.from_url(redis_url, decode_responses=True)
r.ping()

class health:
    def GET(self):
        if r.ping():
            return web.ok()
        else:
            return web.internalerror()

class homepage:
    def GET(self, raw_uuid):
        if not raw_uuid:
            user_id = encodeUUID(uuid.uuid4())
            raise web.found(f'/{user_id}')
            
        return render.homepage(cacheBust)

class api:
    def GET(self, raw_uuid):
        user_uuid = parseUUID(raw_uuid)

        user = User(user_uuid)

        return user.get_activities(r)
    
    def POST(self, raw_uuid):
        user_uuid = parseUUID(raw_uuid)

        user = User(user_uuid)

        raw_body = web.data()
        return user.update_activities(r, raw_body)

if __name__ == "__main__":
    app.run()