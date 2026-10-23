FROM python:3.9.22-slim

RUN apt-get update \
    && apt-get -y install libpq-dev gcc ca-certificates=20250419~deb12u2 \
    && rm -rf /var/lib/apt/lists/*

COPY ./requirements.txt /app/requirements.txt
WORKDIR /app
RUN pip install -r requirements.txt
COPY . /app
CMD exec gunicorn app:app --bind 0.0.0.0:$PORT
