@echo off
cd tryagain
REM    disable skins and backgrounds
REM "C:\Program Files\7-Zip\7z.exe" a tryagain.zip * -xr!.svn
"C:\Program Files\7-Zip\7z.exe" a tryagain.zip * -xr!.svn -x!chrome\tryagain\skin\backgrounds -x!chrome\tryagain\skin\sounds -x!chrome\tryagain\skin\warning*.png -x!chrome\tryagain\skin\bg_*.png
del chrome\tryagain.jar
cd ..
move tryagain\tryagain.zip tryagain.xpi
