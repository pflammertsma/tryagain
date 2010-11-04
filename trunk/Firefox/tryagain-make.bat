@echo off
cd tryagain\chrome\tryagain
"C:\Program Files\7-Zip\7z.exe" a tryagain.zip *
cd ..
move tryagain\tryagain.zip tryagain.jar
cd ..
"C:\Program Files\7-Zip\7z.exe" a tryagain.zip * -x!chrome\tryagain
del chrome\tryagain.jar
cd ..
move tryagain\tryagain.zip tryagain.xpi
