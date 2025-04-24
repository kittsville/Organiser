# Organiser

Dynamically build packing checklists and to-do lists

## Requirements

- Python 3.9 (or use Docker)
- Docker (or Postgres 15)
- pip

Currently [doesn't work](https://github.com/webpy/webpy/issues/799) on Python 3.13

## Setup

1. `python3 -m venv .venv`
2. `source .venv/bin/activate`
3. `pip install -r requirements.txt`

### I don't have Python 3.9

1. Use `docker build -t "organiser" .` to build the app as a Docker image
2. Uncomment the organiser section of `compose.yaml`
3. `docker compose up`
4. Navigate to http://0.0.0.0:8080/

## Running the app

1. `docker compose up` (Ctrl + C when you're done with development)
2. Open a new tab
3. `source .venv/bin/activate`
4. `python app.py`
5. Navigate to http://0.0.0.0:8080/

## Headless version

Organiser is both a webapp with an encrpyted database and a static website. These are hosted separately to ensure you can still use the Organiser if the webapp goes down:
- https://o.sci1.uk/
- https://headless.o.sci1.uk/

The headless version is a Jekyll site that uses a separate page template `index.html` but shares the JS/CSS. Please ensure any changes you make to the JS are compatible with the headless version.

### Running the headless version

1. Install [jekyll](https://jekyllrb.com/), an open-source ruby-based static site generator
2. Open a terminal in the project directory
3. Run `jekyll serve`, which will automatically build and serve the site

## Contributing

Contributions are always welcome. This could mean requesting features, reporting bugs or creating pull requests.

If you don't have or want a GitHub account you could drop me a line via Twitter ([@kittsville](https://twitter.com/kittsville)) or email (kittsville@gmail.com).

Please bear in mind there is a [Code of Conduct](CODE_OF_CONDUCT.md) which defines acceptable behavior.
