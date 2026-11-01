FROM python:3.12.8-slim-bookworm
COPY runner.sh /runner/runner.sh
RUN sed -i 's/\r$//' /runner/runner.sh && chmod 755 /runner/runner.sh
ENTRYPOINT ["/runner/runner.sh"]
