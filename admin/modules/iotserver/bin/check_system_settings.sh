#!/bin/bash

STATUS=`ps aux | grep iot-server-app | grep asterisk | rev | awk '{print $1}' | rev`
full_path=$(realpath $0)
dir_path=$(dirname $full_path)

if [ "$STATUS" = "iot-server-app" ]; then
    STIME=$((RANDOM%30))
    sleep $STIME
    $dir_path/check_system_settings.php 2>&1 >/dev/null
fi
