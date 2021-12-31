const fs = require('fs');
const path = require('path');
const { spawnSync, execSync } = require('child_process');

const prefix = '/home/vgm/Desktop';
const api = 'VGMA'; // or VGMA!

const copyIni = async () => {
    // copy ini file to local then rename folder
    try {
      const copyFile = (file) => {
        return new Promise((resolve, reject) => {
          if (fs.existsSync(file)) {
            const sourceDir = path.parse(file).dir;
            const desDir = sourceDir.replace('origin', 'renamed'); //origin => renamed, movies => phim
            if (!fs.existsSync(desDir)) {
              fs.mkdirSync(desDir, { recursive: true });
            }
            fs.mkdirSync(desDir, { recursive: true });
	//     console.log(`cp '${file}' '${desDir}'`);
            execSync(`cp '${file}' '${desDir}'`);
            resolve('done');

          } else {
	console.log('file missing');
            resolve('done');
          }
        });
      }

      const raw = fs.readFileSync(`${prefix}/database/${api}-full.txt`, { encoding: 'utf-8' });
      // find all ini file
      if (raw) {
        const list = raw.split('\n');
        let i = 0; // 8061
        while (i < list.length) {
          const result = copyFile(list[i]);
          console.log(i);
          if (result) {
            i++;
          }
        }
      }
    } catch (error) {
      console.log('err copy folder', error);
    }
}


const renameFolder = async () => {
    // rename folder
    try {
      const renameFolder = (folder) => {
        return new Promise((resolve, reject) => {
          const content = fs.readFileSync(folder, { encoding: 'utf8' })
          // const newName = content.match(/\|.*\|/).toString().replace(/^\||\|$/, '').replace(/\|\d+\|/, '');
          const newName = content.split('\|')[1];
          const oldPath = path.dirname(folder);
          const newPath = `${path.dirname(oldPath)}/${newName}`;
          console.log(oldPath, newPath);
          fs.renameSync(oldPath, newPath);
          resolve('done');
        });
      }

      // find VGMV file
      const raw = await spawnSync('find', [`${prefix}/database/renamed`, '-type', 'f', '-name', 'Info.ini'], { encoding: 'utf8' });
      console.log(raw);
      if (raw.stdout) {
        const list = raw.stdout.split('\n');
        list.pop();
        list.sort(function compare(a, b) {
          return b.match(/\//g).length - a.match(/\//g).length;
        })
        console.log(list.length);
        let i = 0;
        while (i < list.length) {
          const result = renameFolder(list[i]);
          console.log(i);
          if (result) {
            i++;
          }
        }
      }
    } catch (error) {
      console.log('err copy folder', error);
    }
}


const main = async () => { 
	// copyIni();
	renameFolder();
}
main();