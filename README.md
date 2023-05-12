# Java Service Editor development mode how to

# WINDOWS user Install node from windows installer (https://nodejs.org/en/download/). And select to install Tools for native Modules/windows-build-tools 

This istalls windows-build-tools python and windows-build-tools.
# REBOOT AFTER

# Prerequisite (https://github.com/eclipse-theia/theia/blob/master/doc/Developing.md#prerequisites)
  Node.js >= 12.14.1.
  Node 16.13.0 is used in builds
  If you are interested in Theia's VS Code Extension support then you should use a Node version at least compatible with the one included in the version of Electron used by VS Code.
  Yarn package manager >= 1.7.0 AND < 2.x.x.
  Python3 is required for the build due to node-gyp@8.4.1
  nvm is recommended to easily switch between Node.js versions.

  On windows:
    After installing yarn, run PowerShell as Administrator and copy paste the following: npm --add-python-to-path install --global --production windows-build-tools

    Windows
    If you see LINK : fatal error LNK1104: cannot open file 'C:\\Users\\path\\to\\node.lib' [C:\path\to\theia\node_modules\drivelist\build\drivelist.vcxproj], then set the Visual Studio version manually with npm config set msvs_version 2019 --global

     The following dir has that:
     C:\Program Files (x86)\Microsoft Visual Studio\2019\BuildTools

   You may need to install this globally:
   npm install node-gyp@8.4.1 --g
# if nothing works and continue to get node-gyp error, try the following:
   npm cache clean --force
   npm cache verify

GOOD LINK
https://stackoverflow.com/questions/57879150/how-can-i-solve-error-gypgyp-errerr-find-vsfind-vs-msvs-version-not-set-from-c


## Build and run
git clone https://github.softwareag.com/AIM/java-service-editor.git

## Before building, run:

`git submodule init`

`git submodule update`


## Run
# cd java-service-editor

`gradlew buildApp`

## Running Theia
cd to java-service-editor\applications\java-service-editor-theia-extension\
\jave-service-editor-app\browser

 yarn start <workspace> --hostname 0.0.0.0 --port <port>


## Build and Run Theia in watch mode
C:\git\sag\java-service-editor\applications\java-service-editor-theia-extension
yarn
yarn browser watch
 in a different window cd C:\git\sag\java-service-editor\applications\java-service-editor-theia-extension\jave-service-editor-app\browser
yarn start <workspace> --hostname 0.0.0.0 --port <port>

