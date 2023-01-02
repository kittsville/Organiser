import os
import web
import uuid
import redis
import time

from user import User

urls = (
    '/lists/(.+)', 'list_management',
    '/(.*)', 'homepage'
)
cacheBust   = int(time.time())
render      = web.template.render('templates/')
app         = web.application(urls, globals())

redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
r = redis.from_url(redis_url, decode_responses=True)
r.ping()

class homepage:
    def GET(self, raw_uuid):
        if not raw_uuid:
            raise web.found(f'/{uuid.uuid4()}')
            
        return render.homepage(cacheBust)

class list_management:
    def GET(self, raw_uuid):
        user_uuid = uuid.UUID(raw_uuid, version=4)

        user = User(user_uuid)

        return user.get_lists(r)

if __name__ == "__main__":
    app.run()