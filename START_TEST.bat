@echo off
REM Test copy of the 1MV Listening Form (branch queue-retry).
REM This test DOES send to the real Google Sheet, marked Source = TEST-queue. Delete those rows after testing.
cd /d "%~dp0"
echo Starting the queue test at http://localhost:8797 ...  Keep this window open while testing. Close it to stop.
start "" "http://localhost:8797/?t=public&sync&src=TEST-queue"
python -m http.server 8797
