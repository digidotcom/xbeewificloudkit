# Use this for production (heroku)
web: newrelic-admin run-program gunicorn --worker-class socketio.sgunicorn.GeventSocketIOWorker xbeewifiapp.wsgi
# web: gunicorn --worker-class socketio.sgunicorn.GeventSocketIOWorker xbeewifiapp.wsgi

# Use below instead for local dev on windows which can't run gunicorn
# web: python manage.py runserver "0.0.0.0:$PORT"

# Or this instead to run local dev server with socketio extensions
# web: python manage.py runserver_socketio "0.0.0.0:$PORT"