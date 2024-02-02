#!/bin/bash

# properly handle SIGTERM and SIGINT
trap 'exit 0' TERM INT

if test ${MYSQL_WAIT:-true} != false; then
    # Wait for MySQL to startup
    HOST=$(node -p "require('config').get('knex.connection.host')")
    PORT=3306

    # see http://tldp.org/LDP/abs/html/devref1.html for description of this syntax.
    while ! exec 4<>/dev/tcp/${HOST}/${PORT}; do
        echo "$(date) - still trying to connect to ${HOST}:${PORT}"
        sleep 1
    done
    exec 4>&-
fi

exec "$@"
