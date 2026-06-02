# Use Python 3.11 slim image
FROM python:3.11-slim

# Install system dependencies including ffmpeg and unzip (for deno)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install deno (required by yt-dlp for YouTube JS challenge solving)
RUN curl -fsSL https://deno.land/install.sh | sh
ENV DENO_DIR=/root/.deno
ENV PATH="/root/.deno/bin:${PATH}"

# Install uv package manager
RUN pip install uv

# Set working directory
WORKDIR /app

# Copy pyproject.toml and uv.lock for dependency installation
COPY pyproject.toml uv.lock* ./

# Create virtual environment and install dependencies using uv sync
RUN uv venv .venv && uv sync

# Force update yt-dlp to the absolute latest version to handle YouTube API changes
RUN uv pip install --upgrade --force-reinstall yt-dlp
RUN uv pip install --upgrade --force-reinstall "yt-dlp[default]"

# Copy source code and startup scripts
COPY src/ ./src/
COPY fonts/ ./fonts/
COPY transitions/ ./transitions/
COPY start_hf.sh ./
RUN chmod +x start_hf.sh

# Create necessary directories for video processing
RUN mkdir -p /app/uploads /app/clips /app/logs /tmp

# Configure for Hugging Face Spaces (runs as non-root user UID 1000)
RUN useradd -m -u 1000 user && \
    chown -R 1000:1000 /app /tmp

# Switch to the non-root user
USER user
ENV HOME=/home/user
ENV PATH="/app/.venv/bin:${PATH}"

# Expose Hugging Face Space port (7860)
EXPOSE 7860

# Start FastAPI and the background worker together
CMD ["./start_hf.sh"]
