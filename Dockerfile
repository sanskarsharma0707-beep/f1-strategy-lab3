# Use an official lightweight Python image
FROM python:3.11-slim

# Install GNU Octave on the system
RUN apt-get update && apt-get install -y --no-install-recommends \
    octave \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy requirements and install Python libraries
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all project files into the container
COPY . .

# Expose port and launch Flask
ENV PORT=5000
EXPOSE 5000

CMD ["python", "app.py"]
