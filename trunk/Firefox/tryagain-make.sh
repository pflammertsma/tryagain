#!/bin/sh

cd tryagain
#   disable skins and backgrounds
# 7z a tryagain.zip * -xr!.svn
7z a tryagain.zip * -xr!.svn -x!chrome\tryagain\skin\backgrounds -x!chrome\tryagain\skin\sounds -x!chrome\tryagain\skin\warning*.png -x!chrome\tryagain\skin\bg_*.png
rm chrome/tryagain.jar
cd ..
mv tryagain/tryagain.zip tryagain.xpi

