docker stop ineedrouter 2>/dev/null || true
docker rm ineedrouter 2>/dev/null || true
docker build -t ineedrouter .
docker run -d --name ineedrouter -p 20128:20128 --env-file .env -v ineedrouter-data:/app/data ineedrouter
