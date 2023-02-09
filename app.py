import os
import web
import uuid
import redis
import time

from user import User

def parseUUID(raw_uuid):
    try:
        return uuid.UUID(raw_uuid, version=4)
    except ValueError:
        raise web.badrequest('Invalid UUID')

urls = (
    '/activities/(.+)', 'api',
    '/health', 'health',
    '/([0-9a-z\-]*)', 'homepage'
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
            raise web.found(f'/{uuid.uuid4()}')
            
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