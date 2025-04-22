FROM python:3.9.22-slim

RUN apt-get update \
    && apt-get -y install libpq-dev gcc

COPY ./requirements.txt /app/requirements.txt
WORKDIR /app
RUN pip install -r requirements.txt
COPY . /app
CMD exec python app.py $PORT
