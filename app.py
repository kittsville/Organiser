import os
import web
import redis
import time

from user import User, UserId

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
            user_id = UserId.random()
            raise web.found(f'/{user_id.toBase64String()}')

        return render.homepage(cacheBust)

class api:
    def GET(self, raw_uuid):
        user_id = UserId.fromBase64String(raw_uuid)

        user = User(user_id)

        return user.get_activities(r)

    def POST(self, raw_uuid):
        user_id = UserId.fromBase64String(raw_uuid)

        user = User(user_id)

        raw_body = web.data()
        return user.update_activities(r, raw_body)

if __name__ == "__main__":
    app.run()