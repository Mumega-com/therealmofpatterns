# Remotion render container
# Uses official Remotion base — ships with Node 20, Chromium, all Puppeteer deps pre-installed.
# Build once on VPS, render daily via: docker run --rm -v $(pwd)/out:/app/out rop-video

FROM ghcr.io/remotion-dev/base

WORKDIR /app

# Install deps first (layer-cached unless package.json changes)
COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline

# Copy source
COPY . .

# Default command: render DailyWeather composition
# Override via docker run args, e.g.:
#   docker run --rm -v $(pwd)/out:/app/out rop-video DailyWeather out/daily.mp4 --props=.render-props.json
ENTRYPOINT ["npx", "remotion", "render"]
CMD ["DailyWeather", "out/daily.mp4", "--log=error", "--concurrency=4"]
