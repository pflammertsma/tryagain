@echo off
cd tryagain\chrome\tryagain
"C:\Program Files\7-Zip\7z.exe" a tryagain.zip * -x!.svn
cd ..
move tryagain\tryagain.zip tryagain.jar
cd ..
"C:\Program Files\7-Zip\7z.exe" a tryagain.zip * -x!chrome\tryagain -x!.svn
del chrome\tryagain.jar
cd ..
move tryagain\tryagain.zip tryagain.xpi
