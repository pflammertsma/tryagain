@echo off
set pwd=%cd%
REM tasklist /FI "IMAGENAME eq firefox.exe" 2>NUL | find /I /N "firefox.exe">NUL
REM if "%ERRORLEVEL%"=="0" taskkill /im firefox.exe
cd tryagain
REM    disable skins and backgrounds
REM "C:\Program Files\7-Zip\7z.exe" a tryagain.zip * -xr!.svn
"C:\Program Files\7-Zip\7z.exe" a tryagain.zip * -xr!.svn -x!chrome\tryagain\skin\backgrounds -x!chrome\tryagain\skin\sounds -x!chrome\tryagain\skin\warning*.png -x!chrome\tryagain\skin\bg_*.png
del chrome\tryagain.jar
cd ..
move tryagain\tryagain.zip tryagain.xpi
:resume
REM tasklist /FI "IMAGENAME eq firefox.exe" 2>NUL | find /I /N "firefox.exe">NUL
REM if "%ERRORLEVEL%"=="0" goto endFirefox
REM start "Firefox launcher" "C:\Program Files\Mozilla Firefox\firefox.exe" -profile "C:\Users\Paul\AppData\Roaming\Mozilla\Firefox\Profiles\ickerg91.Minefield" -install-global-extension tryagain.xpi
start "Firefox launcher" "C:\Program Files\Mozilla Firefox\firefox.exe" "%pwd%\tryagain.xpi"
goto done
:endFirefox
taskkill /im firefox.exe
timeout /t 2
goto resume
:done