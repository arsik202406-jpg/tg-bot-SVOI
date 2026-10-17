FROM python:3.11-slim

WORKDIR /app

# Отключение буферизации вывода Python для мгновенного появления логов
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "-m", "bot_code.bot"]
