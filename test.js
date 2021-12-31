const {  spawn } = require('child_process');
const fs = require('fs');
const path = require('path');


// const downloadLocal = async (filePath, tmpPath) => {
//         console.log('downloading local: ', `"${filePath}"`, `"${tmpPath}"`);
//         return new Promise((resolve) => {
//           const rclone = spawn('rclone', ['copy', '--progress', `${filePath}`, `${tmpPath}`]);
//           rclone.stdout.on('data', async (data) => {
//             console.log(`rclone download stdout: ${data}`);
//           });
//           rclone.stderr.on('data', async (data) => {
//             console.log(`Stderr: ${data}`);
//           });
//           rclone.on('close', async (code) => {
//             console.log(`download local successfull with code:`, code);
//             resolve('done');
//           })
//         });
//       }

const moveFile = async (srcPath, desPath) => {
        console.log('move file: uplink mv', `"${srcPath}"`, `"${desPath}"`);
        return new Promise((resolve) => {
          const uplink = spawn('uplink', ['mv', `${srcPath}`, `${desPath}`]);
          uplink.stdout.on('data', async (data) => {
            console.log(`uplink mv stdout: ${data}`);
          });
          uplink.stderr.on('data', async (data) => {
            console.log(`uplink stderr: ${data}`);
          });
          uplink.on('close', async (code) => {
            console.log(`mv file successfull with code:`, code);
            resolve('done');
          })
          // resolve('done');
        });
      }

const main = async () => { 
	const mp4Tmp = '/home/vgm/Desktop/NhacKichChuaGiexu.mp4';
	const tmpPath = '/home/vgm/Desktop/test123.mp4';
  const txtPath = '/home/vgm/Desktop/testwarehouse.txt';
// // spawn function
// 	const mp4 = spawn('ffmpeg', ['-vsync', '0', '-i', `${mp4Tmp}`, '-c:v', 'h264_nvenc', '-filter:v', 'pad=width=max(iw\\,ih*(16/9)):height=ow/(16/9):x=(ow-iw)/2:y=(oh-ih)/2', '-c:a', 'copy', `${tmpPath}`]);
// 	mp4.stdout.on('data', async (data) => {
//                 console.log(`converting to mp4 stdout: ${data}`);
//               });
//               mp4.stderr.on('data', async (data) => {
//                 console.log(`Stderr: ${data}`);
//               });
//               mp4.on('close', async (code) => {
//                 console.log(`Converted to mp4 done with code:`, code);
//                 // await fs.unlinkSync(mp4Tmp);
//                 // resolve(true);
//               })

  try {
    // start script here
    const raw = fs.readFileSync(txtPath, { encoding: 'utf8' });
    if (raw) {
      let list = raw.split('\n');
      list.pop();
      // list.reverse();
      console.log('total files', list.length);
      let i = 0;
      // process download caching loops
      while (i < list.length) { // list.length or endPoint
        const srcPath = `sj://vgmorigin/warehouse${list[i]}`;
        const des = '01-Bài Giảng/Học Theo Sách Trong Kinh Thánh/Tìm Hiểu Thánh Kinh/THTK59-Thư Gia-cơ';
        const desPath = `sj://vgmorigin/warehouse/VGMV/${des}/${path.basename(list[i])}`;
        // if (!fs.existsSync(tmpPath)) fs.mkdirSync(tmpPath, { recursive: true });
      // await downloadLocal(filePath, tmpPath);
      await moveFile(srcPath, desPath);
      i++;
      }
      // process download caching loops end
    }
  } catch (error) {
    console.log(error);
  }

              
}
main();
