import os
import re
import time

import psycopg2
import psycopg2.extras
from flask import Flask, g, make_response, redirect, render_template, request

from user import User, UserKey

app = Flask(__name__)
app.debug = os.getenv('DATABASE_URL') is None
app.config.update(
    cacheBust=str(int(time.time())),
)

DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'postgres://organiser:supasecret@localhost:5432/organiser',
)
UUID_RE = re.compile(r'^[0-9a-zA-Z\-_]{22}$')

psycopg2.extras.register_uuid()


def get_db():
    if 'db' not in g:
        g.db = psycopg2.connect(
            DATABASE_URL,
            cursor_factory=psycopg2.extras.RealDictCursor,
        )
    return g.db


@app.teardown_appcontext
def close_db(exception):
    db = g.pop('db', None)
    if db is not None:
        db.close()


@app.context_processor
def inject_globals():
    return dict(cacheBust=app.config['cacheBust'])


@app.errorhandler(404)
def page_not_found(error):
    return make_response(render_template('not_found.html'), 404)


@app.errorhandler(500)
def special_exception_handler(error):
    if app.debug:
        raise error
    return make_response(render_template('internal_error.html'), 500)


@app.route('/health')
def health():
    db = get_db()
    with db.cursor() as cur:
        cur.execute("DELETE FROM user_state WHERE expires < NOW()")
    db.commit()
    return '', 200


@app.route('/')
def homepage():
    return render_template('homepage.html')


@app.route('/new')
def new_user():
    user_key = UserKey.random()
    user = User(get_db(), user_key)
    user.setup_first_activities()
    return redirect(
        f'/{user_key.base64_uuid()}?key={user_key.base64_encrpytion_key()}',
        302,
    )


@app.route('/<raw_uuid>')
def activities(raw_uuid):
    if not UUID_RE.match(raw_uuid):
        return make_response(render_template('not_found.html'), 404)

    raw_encryption_key = request.args.get('key', '')
    user_key = UserKey.from_base64_strings(raw_uuid, raw_encryption_key)
    return render_template('activities.html', user_uuid=user_key.uuid)


@app.route('/api/activities/<raw_uuid>', methods=['GET', 'POST'])
def api(raw_uuid):
    if not UUID_RE.match(raw_uuid):
        return make_response(render_template('not_found.html'), 404)

    raw_encryption_key = request.args.get('key', '')
    user_key = UserKey.from_base64_strings(raw_uuid, raw_encryption_key)
    user = User(get_db(), user_key)

    if request.method == 'GET':
        return user.get_activities()

    return user.update_activities(request.get_data())


if __name__ == "__main__":
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port)
