FROM python:3.11-slim

WORKDIR /app

COPY api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY api/ ./api/
COPY server.py .

EXPOSE 8080

CMD ["python", "server.py", "8080"]
