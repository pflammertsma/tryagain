#!/bin/sh

cd tryagain/chrome/tryagain/
7z a tryagain.zip * -x!.svn
cd ..
mv tryagain/tryagain.zip tryagain.jar
cd ..
7z a tryagain.zip * -x!chrome/tryagain -x!.svn
rm chrome/tryagain.jar
cd ..
mv tryagain/tryagain.zip tryagain.xpi

