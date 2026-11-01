#!/bin/sh
# Trusted entrypoint baked into runner images. Learner code never chooses image/command/flags.
# stdin protocol:  "<payload-bytes>\n" + <payload> + <program stdin...>
# modes: py | cpp-compile | bin-run
mode="$1"
read -r len
head -c "$len" > /tmp/payload

case "$mode" in
  py)
    exec timeout -k 1 "${TL:-3}" python3 -I /tmp/payload
    ;;
  cpp-compile)
    mv /tmp/payload /tmp/src.cpp
    timeout -k 1 "${TL:-10}" g++ -O2 -std=c++17 -o /tmp/a.out /tmp/src.cpp 2>/tmp/cerr
    rc=$?
    if [ "$rc" -ne 0 ]; then
      head -c 4096 /tmp/cerr >&2
      if [ "$rc" -eq 124 ]; then exit 124; fi
      exit 90
    fi
    cat /tmp/a.out
    ;;
  bin-run)
    chmod +x /tmp/payload
    exec timeout -k 1 "${TL:-3}" /tmp/payload
    ;;
  *)
    echo "unknown mode" >&2
    exit 2
    ;;
esac
