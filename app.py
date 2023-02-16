import os
import web
import redis
import time

from user import User, UserKey

urls = (
    '/api/activities/([0-9a-zA-Z\-\_]{22})', 'api',
    '/health', 'health',
    '/([0-9a-zA-Z\-\_]{22})', 'activities',
    '/new', 'new_user',
    '/', 'homepage'
)
global_vars = {
    'cacheBust' : str(int(time.time()))
}
templates       = web.template.render('templates/', base='layout', globals=global_vars)
app             = web.application(urls, globals())
app.notfound    = lambda: web.notfound(templates.not_found())

if not web.config.debug:
    app.internalerror = lambda: web.internalerror(templates.internal_error())

redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
r = redis.from_url(redis_url)
r.ping()

class health:
    def GET(self):
        if r.ping():
            return web.ok()
        else:
            return web.internalerror()

class homepage:
    def GET(self):
        return templates.homepage()

class new_user:
    def GET(self):
        user_key = UserKey.random()
        raise web.found(f'/{user_key.base64_uuid()}?key={user_key.base64_encrpytion_key()}')

class activities:
    def GET(self, raw_uuid):
        raw_encryption_key = web.input().key
        user_key = UserKey.from_base64_strings(raw_uuid, raw_encryption_key)

        return templates.activities(user_key.uuid)

class api:
    def GET(self, raw_uuid):
        raw_encryption_key = web.input().key
        user_key = UserKey.from_base64_strings(raw_uuid, raw_encryption_key)

        user = User(r, user_key)

        return user.get_activities()

    def POST(self, raw_uuid):
        raw_encryption_key = web.input().key
        user_key = UserKey.from_base64_strings(raw_uuid, raw_encryption_key)

        user = User(r, user_key)

        raw_body = web.data()
        return user.update_activities(raw_body)

if __name__ == "__main__":
    app.run()