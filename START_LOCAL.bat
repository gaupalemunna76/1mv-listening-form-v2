@echo off
REM Version 2 on this computer, for trying new features. Nothing is sent to any Google Sheet from here.
cd /d "%~dp0"
echo V2 local copy at http://localhost:8798  (debug panel on). Keep this window open; close it to stop.
start "" "http://localhost:8798/?t=public&debug"
python -m http.server 8798
