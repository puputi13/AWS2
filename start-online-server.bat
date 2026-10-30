@echo off
chcp 65001 >nul
cd /d "%~dp0server"
echo オンライン対戦サーバーを起動します...
node server.js
pause
