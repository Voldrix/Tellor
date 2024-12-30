# Tellor
__Kanban todo app__\
__Simple, minimal, single-user, compact UI__

[Live Demo](https://voldrixia.com/tellor/?b=18486f63be6bb5f2)

## Features
- Loads fast. Lightweight
- Controls are snappy
- Compact, minimal UI
- Single-user design. No authentication.
- Import boards from Trello
- Mobile friendly
- Simple/minimal code that is easy to follow and modify
- No libraries, frameworks, or dependencies. Just plain vanilla JS/PHP

### Requirements (LAMP)
Apache / Nginx\
PHP 7+\
mysql / mariadb

### Setup
Clone repo into web directory\
Open `setup-db.sh` and set DB user options. Can be new user\
Run `./setup-db.sh` as root to create database\
Copy DB creds into `api.php` line 6

There are default credentials, so steps 2 and 4 are optional

### Import / Export

Tellor (and Trello) allow you to export boards to JSON.\
Tellor can import boards from either source.\
Tellor boards cannot be ported to Trello.

### Security
This is a single user application without the hassle of authentication.\
But that means anyone who can find/access your board can modify it.\
This application is meant to be kept in a private web directory, not publicly accessible. Either on a local network server, or protected upstream by the reverse proxy.

### License
[MIT](LICENSE)
