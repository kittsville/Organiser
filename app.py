import os
import web
import time
import redis
import psycopg2.extras

from user import User, UserKey

urls = (
    '/api/activities/([0-9a-zA-Z\-\_]{22})', 'api',
    '/health', 'health',
    '/([0-9a-zA-Z\-\_]{22})', 'activities',
    '/new', 'new_user',
    '/', 'homepage',
    '/migrate', 'migrate'
)
web.config.debug = os.getenv('DATABASE_URL') is None
global_vars = {
    'cacheBust' : str(int(time.time()))
}
templates       = web.template.render('templates/', base='layout', globals=global_vars)
app             = web.application(urls, globals())
db              = web.database(dburl=os.getenv('DATABASE_URL', 'postgres://organiser:supasecret@localhost:5432/organiser'))
app.notfound    = lambda: web.notfound(templates.not_found())

psycopg2.extras.register_uuid()

if not web.config.debug:
    app.internalerror = lambda: web.internalerror(templates.internal_error())

redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
r = redis.from_url(redis_url)
r.ping()

class health:
    def GET(self):
        db.query("DELETE FROM user_state WHERE expires < NOW()")
        
        return web.ok()

class migrate:
    def GET(self):
        for key in r.keys(pattern="Organiser:*"):
            user_uuid = key.decode().removeprefix("Organiser:")
            print(f"Processing user {user_uuid}")
            encrypted_user_data = r.get(key)

            success = db.query(f'INSERT INTO {User.STATE_TABLE_NAME} (uuid, encrypted_raw_state, expires) VALUES ($a, $b, $c)', vars={'a': user_uuid, 'b':encrypted_user_data, 'c':User.STATE_EDITED_EXPIRY_SQL})

            if not success:
                raise web.internalerror("Failed to create user with default activities")

        return "Done!"

class homepage:
    def GET(self):
        return templates.homepage()

class new_user:
    def GET(self):
        user_key = UserKey.random()
        user = User(db, user_key)
        user.setup_first_activities()

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

        user = User(db, user_key)

        return user.get_activities()

    def POST(self, raw_uuid):
        raw_encryption_key = web.input().key
        user_key = UserKey.from_base64_strings(raw_uuid, raw_encryption_key)

        user = User(db, user_key)

        raw_body = web.data()
        return user.update_activities(raw_body)

if __name__ == "__main__":
    app.run()