FROM python:3.12-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        openjdk-21-jre \
        bash \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN chmod +x /app/p2rank/prank.sh

ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH="${JAVA_HOME}/bin:${PATH}"

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]