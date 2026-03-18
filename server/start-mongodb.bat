@echo off
echo Starting MongoDB with memory limit (256MB cache)...
start "" "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" --config "D:\Social_Media_App\server\mongod.cfg"
echo MongoDB started. Check logs at: server\mongodb-logs\mongod.log
