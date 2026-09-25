@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install Node.js 24 LTS from https://nodejs.org/
  echo Then reopen this launcher.
  pause
  exit /b 1
)
node -e "var v=process.versions.node.split('.');process.exit(+v[0]>22||(+v[0]===22&&+v[1]>=12)?0:1)"
if errorlevel 1 (
  echo Node.js 22.12 or newer is required. Install Node.js 24 LTS from https://nodejs.org/
  echo Then reopen this launcher.
  pause
  exit /b 1
)
node "%~dp0scripts\start.mjs"
if errorlevel 1 (
  pause
  exit /b 1
)
