# Organiser

Dynamically build packing checklists and to-do lists

## Requirements

- Python 3.9
- Docker (or Postgres 15)
- pip

Currently [doesn't work](https://github.com/webpy/webpy/issues/799) on Python 3.13

## Setup

1. `python3 -m venv .venv`
2. `source .venv/bin/activate`
3. `pip install -r requirements.txt`

## Running the app

1. `docker compose up` (Ctrl + C when you're done with development)
2. Open a new tab
3. `source .venv/bin/activate`
4. `python app.py`
5. Navigate to http://0.0.0.0:8080/

## Contributing

Contributions are always welcome. This could mean requesting features, reporting bugs or creating pull requests.

If you don't have or want a GitHub account you could drop me a line via Twitter ([@kittsville](https://twitter.com/kittsville)) or email (kittsville@gmail.com).

Please bear in mind there is a [Code of Conduct](CODE_OF_CONDUCT.md) which defines acceptable behavior.
