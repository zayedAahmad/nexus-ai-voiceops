@echo off
setlocal
title Nexus AI VoiceOps - One Link

cd /d "%~dp0\02_Frontend_Banking_UI"
if not exist node_modules (
  echo Installing frontend packages...
  call npm install
  if errorlevel 1 goto failed
)

cd /d "%~dp0\01_Backend_Node_API"
if not exist node_modules (
  echo Installing backend packages...
  call npm install
  if errorlevel 1 goto failed
)

echo.
echo Nexus AI VoiceOps is starting on one link:
echo http://localhost:4173/login
echo.
echo Keep this window open while presenting the demo.
echo.
call npm start
goto done

:failed
echo.
echo Setup failed. Make sure Node.js and npm are installed, then run this file again.
pause

:done
endlocal
