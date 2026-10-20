FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    chromium \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://mise.run | sh

ENV PATH="/root/.local/bin:/root/.local/share/mise/shims:${PATH}"

WORKDIR /workspace

COPY mise.toml /workspace/mise.toml

RUN mise trust /workspace/mise.toml && mise install --yes

RUN ln -sf /usr/bin/chromium /usr/local/bin/google-chrome \
    && ln -sf /usr/bin/chromium /usr/local/bin/chromium-browser
CMD ["sleep", "infinity"]
