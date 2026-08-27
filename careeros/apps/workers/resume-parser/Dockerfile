FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY package.json .
RUN pip install --no-cache-dir -r package.json 2>/dev/null || true

COPY . .

EXPOSE 8001
CMD ["python", "src/main.py"]
