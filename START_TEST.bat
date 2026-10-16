@echo off
REM Test copy of the 1MV Listening Form (branch mic-retry). Nothing is sent to the Google Sheet from here.
cd /d "%~dp0"
echo Starting the test form at http://localhost:8795 ...  Keep this window open while testing. Close it to stop.
start "" http://localhost:8795/?t=public
python -m http.server 8795
