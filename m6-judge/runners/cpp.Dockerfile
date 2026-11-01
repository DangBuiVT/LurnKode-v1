FROM debian:bookworm-20241202-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends g++ \
 && rm -rf /var/lib/apt/lists/*
COPY runner.sh /runner/runner.sh
RUN sed -i 's/\r$//' /runner/runner.sh && chmod 755 /runner/runner.sh
ENTRYPOINT ["/runner/runner.sh"]
