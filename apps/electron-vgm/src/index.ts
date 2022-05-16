import { app, BrowserWindow, ipcMain, screen, dialog, Menu, globalShortcut } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import * as url from 'url'
import { exec, spawn, execSync, spawnSync } from 'child_process'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './graphql/app.module'
// import { create, globSource, CID } from 'ipfs-http-client'
import * as CryptoJS from "crypto-js";
import { slice } from 'ramda';
import * as M3U8FileParser from "m3u8-file-parser";
import * as bitwise from 'bitwise';
import { NFTStorage, File, Blob } from 'nft.storage'
import { Buffer } from 'buffer';
import * as pinyin from 'chinese-to-pinyin';

import PQueue from 'p-queue';
const queue = new PQueue();

queue.on('add', () => {
	console.log(`Task is added.  Size: ${queue.size}  Pending: ${queue.pending}`);
});

queue.on('next', () => {
	console.log(`Task is completed.  Size: ${queue.size}  Pending: ${queue.pending}`);
});

queue.on('idle', () => {
	console.log(`Queue is idle.  Size: ${queue.size}  Pending: ${queue.pending}`);
});

const lang = '-hmong';
const rcloneConfig = {
	gateway: `https://cdn.vgm.tv/encrypted${lang}/`,
	origin: `VGM-Origin:vgmorigin/origin${lang}`,
	warehouse: `VGM-Origin:vgmorigin/warehouse${lang}`,
	encrypted: `VGM-Converted:vgmencrypted/encrypted${lang}`
}

let serve;
const args = process.argv.slice(1);
serve = args.some((val) => val === '--serve');

let ipfsInfo;
interface FileInfo {
	pid: string,
	location: string,
	name: string,
	size: number,
	duration: string,
	qm: string,
	url: string,
	hash: string,
	isVideo: boolean,
	dblevel: number
}

let win: Electron.BrowserWindow = null;
let menu: Electron.Menu;
const getFromEnv = parseInt(process.env.ELECTRON_IS_DEV, 10) === 1;
const isEnvSet = 'ELECTRON_IS_DEV' in process.env;
const debugMode = isEnvSet
	? getFromEnv
	: process.defaultApp ||
	/node_modules[\\/]electron[\\/]/.test(process.execPath);

/**
 * Electron window settings
 */
const mainWindowSettings: Electron.BrowserWindowConstructorOptions = {
	frame: true,
	resizable: true,
	focusable: true,
	fullscreenable: true,
	kiosk: false,
	// to hide title bar, uncomment:
	// titleBarStyle: 'hidden',
	webPreferences: {
		devTools: debugMode,
		nodeIntegration: debugMode,
	},

};


// create graphql server function
async function bootstrap() {
	const app = await NestFactory.create(AppModule)
	await app.listen(6789, () => {
		console.log(`
  🚀 Server ready at: http://localhost:6789/graphql
  ⭐️ See sample queries: http://pris.ly/e/ts/graphql-nestjs#using-the-graphql-api
  `)
	})
}
/**
 * Hooks for electron main process
 */
function initMainListener() {

	ipcMain.on('ELECTRON_BRIDGE_HOST', (event, msg) => {
		console.log('msg received', msg);
		if (msg === 'ping') {
			event.sender.send('ELECTRON_BRIDGE_CLIENT', 'pong');
		}
	});

}

function createMenu() {
	const template: Electron.MenuItemConstructorOptions[] = [
		{ role: 'fileMenu' },
		{ role: 'editMenu' },
		{
			label: 'View',
			submenu: [
				{ role: 'zoomIn' },
				{ role: 'zoomOut' },
				{ role: 'resetZoom' },
				{ type: 'separator' },
				{ role: 'togglefullscreen' }
			]
		},
		{ role: 'window', submenu: [{ role: 'minimize' }, { role: 'close' }] },
		{
			role: 'help',
			submenu: [{
				label: 'Learn More',
				click() {
					require('electron').shell.openExternal('https://www.vgm.tv');
				}
			}]
		}
	];
	menu = Menu.buildFromTemplate(template);
	Menu.setApplicationMenu(menu);
}
/**
 * Create main window presentation
 */
function createWindow() {
	// start creating electron window
	const sizes = screen.getPrimaryDisplay().workAreaSize;
	mainWindowSettings.width = 1100;
	mainWindowSettings.height = 800;
	mainWindowSettings.x = (sizes.width - 1100) / 2;
	mainWindowSettings.y = (sizes.height - 800) / 2;

	if (debugMode) {
		process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
	}

	win = new BrowserWindow(mainWindowSettings);

	let launchPath;
	if (serve) {
		require('electron-reload')(__dirname, {
			electron: require(`${__dirname}/../../../node_modules/electron`),
		});
		launchPath = 'http://localhost:4211';
		win.loadURL(launchPath);
	} else {
		launchPath = url.format({
			pathname: path.join(__dirname, 'index.html'),
			protocol: 'file:',
			slashes: true,
		});
		win.loadURL(launchPath);
	}
	// register macos cmd+Q shortcut for quitting
	if (process.platform === 'darwin') {
		globalShortcut.register('Command+Q', () => {
			app.quit();
		})
	}
	console.log('launched electron with:', launchPath);

	win.on('closed', () => {
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		win = null;
	});

	initMainListener();

	if (debugMode) {
		// Open the DevTools.
		win.webContents.openDevTools();
		// client.create(applicationRef);
	}
}

try {

	app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');
	app.on('ready', async () => {
		try {
			// get graphql server ready before creating electron window
			await bootstrap();
			createWindow();
			createMenu();
		} catch (error) {
			console.log(error);
		}
	});

	app.on('window-all-closed', quit);

	ipcMain.on('quit', quit);

	ipcMain.on('minimize', () => {
		win.minimize();
	});

	ipcMain.on('maximize', () => {
		win.maximize();
	});

	ipcMain.on('restore', () => {
		win.restore();
	});

	// Listen to renderer process and open dialog for input and output path
	ipcMain.handle('open-dialog', async (event, isFile) => {
		try {
			let options = {};
			if (isFile) {
				options = {
					title: 'Browse Video Folder',
					filters: [{ name: 'Media', extensions: ['mkv', 'avi', 'mp4', 'm4a', 'mp3', 'wav', 'wma', 'aac', 'webm'] }],
					properties: ['openFile', 'multiSelections']
				}
			} else {
				options = {
					title: 'Browse Video Folder',
					properties: ['openDirectory']
				}
			}
			const result = await dialog.showOpenDialog(win, options);
			return result.filePaths;
		} catch (error) {
			console.log(error);
			return null;
		}
	})

	ipcMain.handle('save-dialog', async (event) => {
		try {
			const result = await dialog.showOpenDialog(win, {
				title: 'Browse Output Folder',
				properties: ['openDirectory']
			})
			return result.filePaths;
		} catch (error) {
			console.log(error);
			return null;
		}
	})

	ipcMain.handle('error-message', (event, arg) => {
		if (arg === 'missing-path') {
			const options = {
				type: 'warning',
				title: 'Warning',
				message: 'Invalid input/output or database',
				detail: 'Please select valid source, destination and database',
			};
			showMessageBox(options);
		} else if (arg === 'empty-select') {
			const options = {
				type: 'warning',
				title: 'Warning',
				message: 'No file selected',
				detail: 'Select file to be modified, please try again',
			};
			showMessageBox(options);
		} else if (arg === 'topic-db-error') {
			const options = {
				type: 'warning',
				title: 'Warning',
				message: 'Error creating new topic',
				detail: 'Existing topic or server error',
			};
			showMessageBox(options);
		}
	})


	// Get input and output path from above and execute sh file
	ipcMain.handle('start-convert', async (event, argInPath, argOutPath, fileOnly, pItem) => {
		// console.log('args', argInPath, argOutPath, fileOnly, pItem);
		const upConverted = async (convertedTemp, uploadPath) => {
			console.log('uploading converted file', `${convertedTemp}/`, `${uploadPath}/`);
			return new Promise((resolve) => {
				const rclone = spawn('rclone', ['copy', '--progress', `${convertedTemp}/`, `${uploadPath}/`]);
				rclone.stdout.on('data', async (data) => {
					console.log(`rclone upconvert stdout: ${data}`);
				});
				rclone.stderr.on('data', async (data) => {
					console.log(`Stderr: ${data}`);
				});
				rclone.on('close', async (code) => {
					console.log(`Upload converted file done with code:`, code);
					resolve('done');
				})
			});
		}

		const checkMP4 = async (tmpPath, fType) => {
			console.log('checking downloaded file', `${tmpPath}`);
			return new Promise(async (resolve) => {
				let info = await execSync(`ffprobe -v quiet -print_format json -show_streams "${tmpPath}"`, { encoding: 'utf8' });
				if (fType === 'video') {
					const jsonInfo = JSON.parse(info);
					const displayRatio = (jsonInfo.streams[0].width / jsonInfo.streams[0].height).toFixed(2);
					console.log(jsonInfo.streams[0].codec_long_name, displayRatio);
					// await fs.appendFileSync(`${prefix}/database/${fileType}-converted-count.txt`, `\n${tmpPath} ${jsonInfo.streams[0].codec_long_name} ${displayRatio}`);
					if (jsonInfo.streams[0].codec_long_name === 'MPEG-4 part 2' || displayRatio === (4 / 3).toFixed(2)) {
						const tmpName = path.parse(tmpPath).name;
						const mp4Tmp = tmpPath.replace(tmpName, `${tmpName}1`);
						await execSync(`mv "${tmpPath}" "${mp4Tmp}"`);
						console.log(mp4Tmp, tmpPath);

						const mp4 = spawn('ffmpeg', ['-vsync', '0', '-i', `${mp4Tmp}`, '-c:v', 'h264_nvenc', '-filter:v', 'pad=width=max(iw\\,ih*(16/9)):height=ow/(16/9):x=(ow-iw)/2:y=(oh-ih)/2', '-c:a', 'copy', `${tmpPath}`]);
						// ffmpeg -vsync 0 -i '/home/vgm/Desktop/test.mp4' -c:v h264_nvenc -c:a aac '/home/vgm/Desktop/test2.mp4'
						mp4.stdout.on('data', async (data) => {
							console.log(`converting to mp4 stdout: ${data}`);
						});
						mp4.stderr.on('data', async (data) => {
							console.log(`Stderr: ${data}`);
						});
						mp4.on('close', async (code) => {
							console.log(`Converted to mp4 done with code:`, code);
							await fs.unlinkSync(mp4Tmp);
							resolve(true);
						})
					} else {
						console.log('mp4 h264 file ok');
						resolve(true);
					}
				} else {
					console.log('mp3 file ok');
					resolve(true);
				}
			});
		}

		const convertFile = async (file: string, fType: string, pItem, argOutPath) => {
			return new Promise(async (resolve) => {
				let fileInfo: FileInfo = { pid: '', location: '', name: '', size: 0, duration: '', qm: '', url: '', hash: '', isVideo: false, dblevel: 0 };
				let metaData: any = [];
				// get file Info
				metaData = execSync(`ffprobe -v quiet -select_streams v:0 -show_entries format=filename,duration,size,stream_index:stream=avg_frame_rate -of default=noprint_wrappers=1 "${file}"`, { encoding: "utf8" }).split('\n');
				// Then run ffmpeg to start convert
				const duration_stat: string = metaData.filter(name => name.includes("duration=")).toString();
				const duration: number = parseFloat(duration_stat.replace(/duration=/g, ''));
				const minutes: number = Math.floor(duration / 60);
				fileInfo.duration = `${minutes}:${Math.floor(duration) - (minutes * 60)}`;
				fileInfo.size = parseInt(metaData.filter(name => name.includes("size=")).toString().replace('size=', ''));
				fileInfo.name = path.parse(file).name;
				// process filename
				const nonVietnamese = nonAccentVietnamese(fileInfo.name);
				const nonChinese = await pinyin(nonVietnamese, { removeTone: true, keepRest: true }); // this line for non Chinese characters
				fileInfo.url = `${pItem.url}.${nonChinese.toLowerCase().replace(/[\W\_]/g, '-').replace(/-+-/g, "-")}`;
				fileInfo.location = `${pItem.location}/${nonChinese.replace(/\s/g, '')}`;
				const outPath = `${argOutPath}/${fileInfo.url.replace(/.*\./g, '')}`;
				fileInfo.isVideo = pItem.isVideo;
				fileInfo.pid = pItem.id;
				fileInfo.dblevel = pItem.dblevel + 1;
				console.log(fileInfo, 'start converting ffmpeg');
				console.log(`'bash', ['ffmpeg-exec.sh', "${file}", "${outPath}", ${fType}]`);
				const conversion = spawn('bash', ['ffmpeg-exec.sh', `"${file}"`, `"${outPath}"`, fType]);
				conversion.stdout.on('data', async (data) => {
					console.log(`conversion stdout: ${data}`, totalFiles, convertedFiles);
					const ffmpeg_progress_stat: string[] = data.toString().split('\n');
					if (ffmpeg_progress_stat && fileType === 'video') {
						// get fps and total duration
						const fps_stat: string = metaData.filter(name => name.includes("avg_frame_rate=")).toString();
						const converted_frames: string = ffmpeg_progress_stat.filter(name => name.includes("frame=")).toString();
						if (fps_stat && duration_stat && converted_frames) {
							const fps: number = parseInt(fps_stat.match(/\d+/g)[0]) / parseInt(fps_stat.match(/\d+/g)[1]);
							// calculate total frames
							if (fps && duration) {
								const total_frames: number = Math.round(duration * fps);
								const converted_frames_num: number = parseInt(converted_frames.match(/\d+/)[0])
								if (converted_frames_num && total_frames) {
									progression_status = converted_frames_num / total_frames;
								}
							}
						}
						event.sender.send('progression', progression_status, convertedFiles, totalFiles);
					} else if (ffmpeg_progress_stat && fileType === 'audio') {
						// get converted time
						const time_stat: string = ffmpeg_progress_stat.filter(time => time.includes('out_time_ms=')).toString();
						if (time_stat && duration_stat) {
							const converted_time: number = parseInt(time_stat.replace(/[(out_time_ms=)\.]/g, ''));
							const audio_duration: number = parseInt(duration_stat.replace(/[(duration=)\.]/g, ''));
							// calculate progress
							if (converted_time && audio_duration) {
								progression_status = converted_time / audio_duration;
							}
						}
						event.sender.send('progression', progression_status, convertedFiles, totalFiles);
					}
				});

				conversion.stderr.on('data', async (data) => {
					const options = {
						type: 'warning',
						title: 'stdError',
						message: data.toString(),
						detail: 'None expected standard errors occurred, please try again.',
					};
					showMessageBox(options);
					event.sender.send('exec-done');
					console.log(`Stderr: ${data}`);
				});

				conversion.on('close', async (code) => {
					console.log('converted file done with code:', code);
					// encrypt m3u8 key
					try {
						// get iv info
						const reader = new M3U8FileParser();
						let keyPath: string;
						let VGM: string;
						if (fType === 'audio') {
							keyPath = `${outPath}/128p.m3u8`;
							VGM = 'VGMA';
						} else if (fType === 'video' || fType === 'videoSilence') {
							keyPath = `${outPath}/480p.m3u8`;
							VGM = 'VGMV';
						}
						const segment = await fs.readFileSync(keyPath, { encoding: 'utf-8' });
						reader.read(segment);
						const m3u8 = reader.getResult();
						const secret = `VGM-${m3u8.segments[0].key.iv.slice(0, 6).replace("0x", "")}`;
						// get buffer from key and iv
						const code = Buffer.from(secret);
						const key: Buffer = await fs.readFileSync(`${outPath}/key.vgmk`);
						const encrypted = bitwise.buffer.xor(key, code, false);
						await fs.writeFileSync(`${outPath}/key.vgmk`, encrypted, { encoding: 'binary' });
						console.log('Encrypt key file done');
						// upload converted to s3
						const upConvertedPath = `${rcloneConfig.encrypted}/${VGM}/${fileInfo.url.replace(/\./g, '\/')}`;
						// await fs.cop
						await upConverted(`${outPath}`, upConvertedPath);
						await fs.rmdirSync(outPath, { recursive: true });
						console.log('removed converted folder');

						event.sender.send('create-database', fileInfo);
						resolve(fileInfo);

					} catch (error) {
						console.log('error:', error);
					}

				});


			});
		}

		let files: string[];
		let totalFiles: number = 0;
		let convertedFiles: number = 0;
		let progression_status: number = 0;
		let fileType: string;
		// Get total input file count 
		if (fileOnly) {
			files = argInPath;
		} else {
			files = execSync(`find '${argInPath}' -regextype posix-extended -regex '.*.(mp4|mp3)'`, { encoding: "utf8" }).split('\n');
			files.pop();
		}
		totalFiles = files.length;
		if (files && totalFiles > 0 && convertedFiles < totalFiles) {
			if (pItem.isVideo) {
				fileType = 'video';
				queue.concurrency = 1;
			} else {
				fileType = 'audio';
				queue.concurrency = 20;
			}

			let tasks = [];
			files.forEach(file => {
				tasks.push(async () => {
					const fileOk = await checkMP4(file, fileType); // audio dont need check MP4
					if (fileOk) {
						// convert and up encrypted and database
						let fStat: string;
						const checkNonSilence = await execSync(`ffmpeg -i "${file}" 2>&1 | grep Audio | awk '{print $0}' | tr -d ,`, { encoding: 'utf8' });
						if (checkNonSilence) fStat = fileType; else fStat = 'videoSilence';
						await convertFile(file, fileType, pItem, argOutPath);
					} else {
						console.log(`file data error: cannot read - ${file}`);
					}
					convertedFiles++;
				})
			});
			await Promise.all(tasks.map(task => queue.add(task))).then(async () => {
				const options = {
					type: 'info',
					title: 'Done',
					message: 'Congratulations',
					detail: 'Your files have been converted sucessfully',
				};
				showMessageBox(options);
				event.sender.send('exec-done');
			});

		} else {
			const options = {
				type: 'warning',
				title: 'Warning',
				message: 'No video found',
				detail: 'No valid video files found, please try again.',
			};
			showMessageBox(options);
			event.sender.send('exec-done');
		}

	})

	// Stop conversion process when button onclick
	ipcMain.handle('stop-convert', (event) => {
		//get ffmpeg-exec.sh PID and run command to kill it then kill ffmpeg
		let child = spawn('pgrep', ['-f', 'ffmpeg-exec.sh'], { detached: true });
		child.stdout.on('data', (data) => {
			let ffmpeg_bash_pid = data.toString().trim();
			let killcmd = `kill ${ffmpeg_bash_pid} && killall ffmpeg`;
			exec(killcmd, (error, stdout, stderr) => {
				if (error) {
					console.log(`Error: ${error}`);
					const options = {
						type: 'error',
						title: 'Error',
						message: 'Error cancelling conversion',
						detail: 'None expected errors occured, please try again.',
					};
					showMessageBox(options);
				} else if (stderr) {
					console.log(`Stderr: ${stderr}`);
					const options = {
						type: 'error',
						title: 'Error',
						message: 'Error cancelling conversion',
						detail: 'None expected standard errors occured, please try again.',
					};
					showMessageBox(options);
				} else {
					console.log(`Stdout: ${stdout}`);
					const options = {
						type: 'info',
						title: 'Done',
						message: 'Cancellation',
						detail: 'Your conversion have been cancelled.',
					};
					showMessageBox(options);
				}
			});
		});
		child.stderr.on('data', (data) => { console.log(`stderr: ${data}`) });
		child.on('error', (error) => { console.log(`error: ${error}`) });
		child.on('exit', (code, signal) => {
			if (code) console.log(`Process exit with code: ${code}`)
			if (signal) console.log(`Process killed with signal: ${signal}`)
			console.log(`Done ✅`)
		});

	})


	ipcMain.on('renamedFolder', async (event, prefix, fileType, startPoint, endPoint) => { // start instant code
		// // copy ini file to local then rename folder
		const txtPath = `${prefix}/database/VGMVDir.txt`;
		const copyFile = (file) => {
			return new Promise((resolve, reject) => {
				const sourceDir = path.parse(file).dir;
				const desDir = sourceDir.replace('origin', 'renamed');
				if (!fs.existsSync(desDir)) {
					fs.mkdirSync(desDir, { recursive: true });
				}
				const copy = execSync(`cp '${file}' '${desDir}'`);
				if (copy) {
					resolve('done');
				}
			});
		}

		try {
			const raw = fs.readFileSync(txtPath, { encoding: 'utf8' });
			if (raw) {
				let list = raw.split('\n');
				list.pop();
				// list.reverse();
				console.log('total files', list.length);
				let i = startPoint;

				// convert video loops
				while (i < 1) { // list.length or endPoint
					await copyFile(list[i]);
					console.log('processed files', i);
					i++;
				}
			}
		} catch (error) {
			console.log(error);

		}
	})

	// add mass DB folder recursively
	ipcMain.on('instance-db', async (event, url) => { // instant add to db
		let apiArray = [];
		// add directory to database start
		try {
			const list = await execSync(`find '${url}' -type d -printf '%h\\0%d\\0%p\\n' | sort -t '\\0' -n | awk -F '\\0' '{print $3}'`, { encoding: 'utf8' });
			const listArray = await list.toString().split('\n');
			listArray.pop();
			listArray.shift();
			console.log('listArray:', listArray, listArray.length);
			if (listArray) {
				for await (const folderPath of listArray) {
					const folderName = path.basename(folderPath);
					const pAPI = path.dirname(folderPath).replace(url, '').replace('\/', '');
					apiArray.push({
						pName: pAPI,
						name: folderName,
					})
				}
				event.sender.send('create-manual', apiArray)
				console.log(apiArray);
			}
		} catch (error) {
			console.log('fs promise error:', error);
		}
		// add directory to database end
	})


	ipcMain.on('xor-key', async (event, url, isVideo) => { // start instant code 
		// encrypte && decrypte key start
		let m3u8Name = isVideo ? '480p' : '128p';
		try {
			// encrypt key file
			const reader = new M3U8FileParser();
			const segment = fs.readFileSync(`${url}/${m3u8Name}.m3u8`, { encoding: 'utf-8' });
			reader.read(segment);
			const m3u8 = reader.getResult();
			const secret = `VGM-${m3u8.segments[0].key.iv.slice(0, 6).replace("0x", "")}`;
			// get buffer from key and iv
			const code = Buffer.from(secret);

			const key: Buffer = await fs.readFileSync(`${url}/key.vgmk`);
			const encrypted = bitwise.buffer.xor(key, code, false);
			console.log(key, '\n', code, '\n', encrypted);

			const codeArray = new Uint8Array(code);
			const keyArray = new Uint8Array(key);
			const newKeyArray = new Uint8Array(encrypted);

			console.log(keyArray, codeArray, newKeyArray);
			fs.writeFileSync(`${url}/key.vgmk`, encrypted, { encoding: 'binary' })
		} catch (error) {
			console.log('encrypt key error:', error);
		}
		// encrypte && decrypte key end
	})



	ipcMain.on('test', async (event, prefix, fileType, startPoint, endPoint) => {
		// start instant code
		try {
			let VGM;
			if (fileType === 'audio') {
				VGM = 'VGMA';
				queue.concurrency = 20;
			} else if (fileType === 'video') {
				VGM = 'VGMV';
				queue.concurrency = 1;
			}
			const txtPath = `${prefix}/database${lang}/${VGM}${lang}.txt`;
			// const renamedFolder = `${prefix}/database/renamed/${VGM}/01-Bài Giảng/Tổng Quan Kinh Thánh`; // /06-Phim
			// const originalTemp = `${prefix}/database/tmp`;
			const apiPath = `${prefix}/database${lang}/API`;
			const localOutPath = `${prefix}/database${lang}/converted`;
			// const mountedEncrypted = `${prefix}/database/encrypted`;
			// const mountedOrigin = `${prefix}/database/origin`;
			// const gateway = `https://cdn.vgm.tv/encrypted/${VGM}`;
			// const originalPath = 'VGM-Origin:vgmorigin/origin'; // from onedrive: 'VGM-Movies:' --- from origin: 'VGM-Origin:vgmorigin/origin';
			// const warehousePath = 'VGM-Origin:vgmorigin/warehouse';
			const convertedPath = `vgmvb:vgmvb/converted`; //`VGM-Converted:vgmencrypted/encrypted${lang}` // `vgmvb:vgmvb/converted/video`

			// // exec command
			// const downloadLocal = async (filePath) => {
			//   if (originalPath.includes('Movies')) {
			//     filePath = filePath.replace(/\//, '');
			//   };

			//   console.log('downloading local: ', `"${originalPath}${filePath}"`, `"${originalTemp}"`);
			//   return new Promise((resolve) => {
			//     const rclone = spawn('rclone', ['copy', '--progress', `${originalPath}${filePath}`, `${originalTemp}`]);
			//     rclone.stdout.on('data', async (data) => {
			//       console.log(`rclone download stdout: ${data}`);
			//     });
			//     rclone.stderr.on('data', async (data) => {
			//       console.log(`Stderr: ${data}`);
			//     });
			//     rclone.on('close', async (code) => {
			//       console.log(`download local successfull with code:`, code);
			//       resolve('done');
			//     })
			//   });
			// }

			// const upWarehouse = async (renamedPath, destination) => {
			//   console.log('uploading warehouse: ', `"${renamedPath}"`, `"${warehousePath}${destination}/"`);
			//   return new Promise((resolve) => {
			//     const rclone = spawn('rclone', ['copy', '--progress', `${renamedPath}`, `${warehousePath}${destination}/`]);
			//     rclone.stdout.on('data', async (data) => {
			//       console.log(`rclone upload stdout: ${data}`);
			//     });
			//     rclone.stderr.on('data', async (data) => {
			//       console.log(`Stderr: ${data}`);
			//     });
			//     rclone.on('close', async (code) => {
			//       console.log(`upload warehouse successfully with code:`, code);
			//       resolve('done');
			//     })
			//   });
			// }

			// const removeOldConverted = async (fileLocation) => {
			//   console.log('uploading converted file', `${convertedPath}${fileLocation}/`);
			//   return new Promise((resolve) => {
			//     const rclone = spawn('rclone', ['delete', '--progress', `${convertedPath}${fileLocation}/`]);
			//     rclone.stdout.on('data', async (data) => {
			//       console.log(`rclone removeOldConverted stdout: ${data}`);
			//     });
			//     rclone.stderr.on('data', async (data) => {
			//       console.log(`Stderr: ${data}`);
			//     });
			//     rclone.on('close', async (code) => {
			//       console.log(`rclone removeOldConverted done with code:`, code);
			//       resolve('done');
			//     })
			//   });
			// }

			const upConverted = async (outPath, fileLocation) => {
				console.log('uploading converted file', `${outPath}/`, `${convertedPath}${fileLocation}/`);
				return new Promise((resolve) => {

					const rclone = spawn('rclone', ['copy', '--progress', `${outPath}/`, `${convertedPath}${fileLocation}/`]);
					rclone.stdout.on('data', async (data) => {
						console.log(`rclone upconvert stdout: ${data}`);
					});
					rclone.stderr.on('data', async (data) => {
						console.log(`Stderr: ${data}`);
					});
					rclone.on('close', async (code) => {
						console.log(`Upload converted file done with code:`, code);
						const localStorage = `/media/vgm/DATA/ThirdMill-Converted${fileLocation}`
						if (!fs.existsSync(localStorage)) {
							fs.mkdirSync(localStorage, { recursive: true });
							execSync(`mv ${outPath}/* ${localStorage}/`);
						}
						resolve('done');
					})
				});
			}


			const checkMP4 = async (tmpPath, fType) => {
				console.log('checking downloaded file', `${tmpPath}`);
				return new Promise(async (resolve) => {
					let info;
					try {
						info = await execSync(`ffprobe -v quiet -print_format json -show_streams "${tmpPath}"`, { encoding: 'utf8' });
					} catch (error) {
						await fs.appendFileSync(`${prefix}/databas${lang}/${fileType}-converted-count.txt`, `\n${tmpPath} --fileError cannot read`);
						resolve(false);
					}
					if (fType === 'video') {
						const jsonInfo = JSON.parse(info);
						const displayRatio = (jsonInfo.streams[0].width / jsonInfo.streams[0].height).toFixed(2);
						console.log(jsonInfo.streams[0].codec_long_name, displayRatio);
						await fs.appendFileSync(`${prefix}/database${lang}/${fileType}-converted-count.txt`, `\n${tmpPath} ${jsonInfo.streams[0].codec_long_name} ${displayRatio}`);
						if (jsonInfo.streams[0].codec_long_name === 'MPEG-4 part 2' || displayRatio === (4 / 3).toFixed(2)) {
							const tmpName = path.parse(tmpPath).name;
							const mp4Tmp = tmpPath.replace(tmpName, `${tmpName}1`);
							await execSync(`mv "${tmpPath}" "${mp4Tmp}"`);
							console.log(mp4Tmp, tmpPath);

							const mp4 = spawn('ffmpeg', ['-vsync', '0', '-i', `${mp4Tmp}`, '-c:v', 'h264_nvenc', '-filter:v', 'pad=width=max(iw\\,ih*(16/9)):height=ow/(16/9):x=(ow-iw)/2:y=(oh-ih)/2', '-c:a', 'copy', `${tmpPath}`]);
							// ffmpeg -vsync 0 -i '/home/vgm/Desktop/test.mp4' -c:v h264_nvenc -c:a aac '/home/vgm/Desktop/test2.mp4'
							mp4.stdout.on('data', async (data) => {
								console.log(`converting to mp4 stdout: ${data}`);
							});
							mp4.stderr.on('data', async (data) => {
								console.log(`Stderr: ${data}`);
							});
							mp4.on('close', async (code) => {
								console.log(`Converted to mp4 done with code:`, code);
								await fs.unlinkSync(mp4Tmp);
								resolve(true);
							})
						} else {
							console.log('mp4 h264 file ok');
							resolve(true);
						}
					} else {
						console.log('mp3 file ok');
						resolve(true);
					}
				});
			}

			const convertFile = async (file: string, vName: string, fType: string, pItem, argOutPath) => {
				console.log('convertFile args:', file, vName, fType, argOutPath);

				return new Promise(async (resolve) => {
					let fileInfo: FileInfo = { pid: '', location: '', name: '', size: 0, duration: '', qm: '', url: '', hash: '', isVideo: false, dblevel: 0 };
					let metaData: any = [];
					// get file Info
					metaData = execSync(`ffprobe -v quiet -select_streams v:0 -show_entries format=filename,duration,size,stream_index:stream=avg_frame_rate -of default=noprint_wrappers=1 "${file}"`, { encoding: "utf8" }).split('\n');
					// Then run ffmpeg to start convert
					const duration_stat: string = metaData.filter(name => name.includes("duration=")).toString();
					const duration: number = parseFloat(duration_stat.replace(/duration=/g, ''));
					const minutes: number = Math.floor(duration / 60);
					fileInfo.duration = `${minutes}:${Math.floor(duration) - (minutes * 60)}`;
					fileInfo.size = parseInt(metaData.filter(name => name.includes("size=")).toString().replace('size=', ''));

					// const nameExtPath = files[index].match(/[\w\-\_\(\)\s]+\.[\w\S]{3,4}$/gi).toString();
					// fileInfo.name = nameExtPath.replace(/\.\w+/g, '');
					// fileInfo.name = path.parse(file).name;

					// read file.ini for name (instant code)
					fileInfo.name = vName;
					// process filename
					const nonVietnamese = nonAccentVietnamese(vName);
					const nonChinese = await pinyin(nonVietnamese, { removeTone: true, keepRest: true }); // this line for non Chinese characters
					fileInfo.url = `${pItem.url}.${nonChinese.toLowerCase().replace(/[\W\_]/g, '-').replace(/-+-/g, "-")}`;
					fileInfo.location = `${pItem.location}/${nonChinese.replace(/\s/g, '')}`;
					const outPath = `${argOutPath}/${nonChinese.replace(/\s/g, '')}`;
					fileInfo.isVideo = pItem.isVideo;
					fileInfo.pid = pItem.id;
					fileInfo.dblevel = pItem.dblevel + 1;
					console.log(fileInfo, 'start converting ffmpeg');
					console.log(`'bash', ['ffmpeg-exec.sh', "${file}", "${outPath}", ${fType}]`);
					// start conversion
					const conversion = spawn('bash', ['ffmpeg-exec.sh', `"${file}"`, `"${outPath}"`, fType]);

					conversion.stdout.on('data', async (data) => {
						console.log(`conversion stdout: ${data}`);
					});

					conversion.stderr.on('data', async (data) => {
						console.log(`Stderr: ${data}`);
					});

					conversion.on('close', async (code) => {
						console.log('converted file done with code:', code);
						// encrypt m3u8 key
						try {
							// get iv info
							const reader = new M3U8FileParser();
							let keyPath: string;
							let upConvertedPath: string;
							if (fType === 'audio') {
								keyPath = `${outPath}/128p.m3u8`;
								upConvertedPath = `/audio/${fileInfo.url.replace(/\./g, '\/')}`;
							} else if (fType === 'video' || fType === 'videoSilence') {
								keyPath = `${outPath}/480p.m3u8`;
								upConvertedPath = `/video/${fileInfo.url.replace(/\./g, '\/')}`;
							}
							const segment = await fs.readFileSync(keyPath, { encoding: 'utf-8' });
							reader.read(segment);
							const m3u8 = reader.getResult();
							const secret = `VGM-${m3u8.segments[0].key.iv.slice(0, 6).replace("0x", "")}`;
							// get buffer from key and iv
							const code = Buffer.from(secret);
							const key: Buffer = await fs.readFileSync(`${outPath}/key.vgmk`);
							const encrypted = bitwise.buffer.xor(key, code, false);
							await fs.writeFileSync(`${outPath}/key.vgmk`, encrypted, { encoding: 'binary' });
							console.log('Encrypt key file done');
							// upload converted to s3 instant code
							// await removeOldConverted(upConvertedPath);
							await upConverted(outPath, upConvertedPath);
							await fs.rmdirSync(outPath, { recursive: true });
							console.log('removed converted folder');

							// // upload ipfs
							// if (ipfsClient) {
							//   console.log('uploading ipfs');
							//   // monitor ipfs uploading time
							//   const now = new Date();
							//   const timenow = now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds();
							//   console.log(timenow);
							//   const test = await ipfsClient.add('Hello world');
							//   if (test) {
							//     console.log('Testing IPFS function: success', test);
							//   }

							//   const ipfsOut: any = await ipfsClient.add(globSource(outPath, { recursive: true }));
							//   // got ipfs info
							//   const cid: CID = ipfsOut.cid;
							//   console.log(cid);
							//   fileInfo.qm = cid.toString();
							//   const secretKey = slice(0, 32, `${fileInfo.url}gggggggggggggggggggggggggggggggg`);
							//   fileInfo.hash = CryptoJS.AES.encrypt(fileInfo.qm, secretKey).toString();
							//   fileInfo.size = ipfsOut.size;
							//   console.log('upload ipfs done', fileInfo);
							//   const later = new Date();
							//   const timelater = later.getHours() + ":" + later.getMinutes() + ":" + later.getSeconds();
							//   console.log(timelater);
							//   if (cid) {
							//     fs.rmdirSync(outPath, { recursive: true });
							//   }
							//   event.sender.send('create-database', fileInfo);
							// } else {
							//   event.sender.send('create-database', fileInfo);
							// }
							event.sender.send('create-database', fileInfo);
							resolve('done');

						} catch (error) {
							console.log('error:', error);
						}

					});
					// end conversion

				});
			}


			// const storeDB = async (file: string, vName: string, pItem) => {
			//   console.log('proccessing:', file, vName, pItem.url);

			//   return new Promise(async (resolve) => {
			//     let fileInfo: FileInfo = { pid: '', location: '', name: '', size: 0, duration: '', qm: '', url: '', hash: '', isVideo: false, dblevel: 0 };
			//     let metaData: any = [];
			//     // get file Info
			//     try {
			//       metaData = execSync(`ffprobe -v quiet -select_streams v:0 -show_entries format=filename,duration,size,stream_index:stream=avg_frame_rate -of default=noprint_wrappers=1 "${file}"`, { encoding: "utf8" }).split('\n');
			//     } catch (error) {
			//       await fs.appendFileSync(`${prefix}/database/${fileType}-converted-count.txt`, `\n${file} --fileError cannot read`);
			//       resolve('done');
			//     }
			//     // Then run ffmpeg to start convert
			//     const duration_stat: string = metaData.filter(name => name.includes("duration=")).toString();
			//     const duration: number = parseFloat(duration_stat.replace(/duration=/g, ''));
			//     const minutes: number = Math.floor(duration / 60);
			//     fileInfo.duration = `${minutes}:${Math.floor(duration) - (minutes * 60)}`;
			//     fileInfo.size = parseInt(metaData.filter(name => name.includes("size=")).toString().replace('size=', ''));
			//     fileInfo.name = vName;
			//     // process filename
			//     const nonVietnamese = nonAccentVietnamese(vName);
			//     fileInfo.url = `${pItem.url}.${nonVietnamese.toLowerCase().replace(/[\W\_]/g, '-').replace(/-+-/g, "-")}`;
			//     fileInfo.location = `${pItem.location}/${nonVietnamese.replace(/\s/g, '')}`;
			//     fileInfo.isVideo = pItem.isVideo;
			//     fileInfo.pid = pItem.id;
			//     fileInfo.dblevel = pItem.dblevel + 1;
			//     console.log('send', fileInfo);
			//     event.sender.send('create-database', fileInfo);
			//     await fs.appendFileSync(`${prefix}/database/${fileType}-converted-count.txt`, `\n ${file} db new`);
			//     setTimeout(() => {
			//       resolve('done');
			//     }, 1000);
			//   });
			// }

			// const checkFileExists = async (vName: string, pUrl, fType) => {
			//   return new Promise((resolve) => {
			//     // process filename
			//     const nonVietnamese = nonAccentVietnamese(vName);
			//     const api = `${pUrl}.${nonVietnamese.toLowerCase().replace(/[\W\_]/g, '-').replace(/-+-/g, "-")}`;
			//     const fileUrl = api.replace(/\./g, '/');
			//     let quality;
			//     if (fType === 'video') quality = '480'; else quality = '128';
			//     // // check m3u8 url
			//     const url = `${gateway}/${fileUrl}/${quality}p.m3u8`; // if video 480p.m3u8 audio 128p.m3u8
			//     // // check thumb url
			//     // const url = `${gateway}/${fileUrl}/${quality}/7.jpg`;
			//     // console.log('checkURL curl --silent --head --fail', url);
			//     exec(`curl --silent --head --fail ${url}`, async (error, stdout, stderr) => {
			//       if (error) {
			//         console.log('file exist:', false);
			//         await fs.appendFileSync(`${prefix}/database/${fileType}-converted-count.txt`, `\n${url} --fileMissing`);
			//         resolve(false)
			//       };
			//       if (stderr) console.log('stderr', stderr);
			//       if (stdout) {
			//         console.log('file exist:', true);
			//         await fs.appendFileSync(`${prefix}/database/${fileType}-converted-count.txt`, `\n${url} --fileExist`);
			//         resolve(true);
			//       };
			//     });
			//   });
			// }

			// const checkDBExists = async (vName: string, pUrl) => {
			//   return new Promise((resolve) => {
			//     // process filename
			//     const nonVietnamese = nonAccentVietnamese(vName);
			//     const api = `${pUrl}.${nonVietnamese.toLowerCase().replace(/[\W\_]/g, '-').replace(/-+-/g, "-")}`;
			//     // const fileUrl = api.replace(/\./g, '/');
			//     // const url = `${gateway}/${fileUrl}/128p.m3u8`; // if video 480p/data0.vgmx audio 128p.m3u8
			//     const itemAPIPath = `${apiPath}/items/single/${api}.json`;
			//     console.log('checking api exist', itemAPIPath);

			//     if (fs.existsSync(itemAPIPath)) {
			//       console.log('db exist:', true);
			//       resolve(true);
			//     } else {
			//       console.log('db exist:', false);
			//       resolve(false)
			//     }
			//   });
			// }

			// const extractThumb = async (file: string, vName: string, pItem, argOutPath) => {
			//   console.log('convertFile args:', file, vName, argOutPath);

			//   return new Promise((resolve) => {
			//     const nonVietnamese = nonAccentVietnamese(vName);
			//     const urlPath = `${pItem.url}.${nonVietnamese.toLowerCase().replace(/[\W\_]/g, '-').replace(/-+-/g, "-")}`;
			//     const outPath = `${argOutPath}/${nonVietnamese.replace(/\s/g, '')}`;
			//     console.log('start extracting thumbnail', 'bash', 'ffmpeg-thumb.sh', `"${file}"`, `"${outPath}"`);

			//     const conversion = spawn('bash', ['ffmpeg-thumb.sh', `"${file}"`, `"${outPath}"`]);

			//     conversion.stdout.on('data', async (data) => {
			//       console.log(`conversion stdout: ${data}`);
			//     });

			//     conversion.stderr.on('data', async (data) => {
			//       console.log(`Stderr: ${data}`);
			//     });

			//     conversion.on('close', async (code) => {
			//       console.log('extract thumbnail done with code:', code);
			//       // encrypt m3u8 key
			//       try {
			//         // get iv info
			//         const upConvertedPath = `/VGMV/${urlPath.replace(/\./g, '\/')}`;
			//         await upConverted(outPath, upConvertedPath);
			//         await fs.unlinkSync(file);
			//         // await fs.rmdirSync(outPath, { recursive: true });
			//         console.log('removed converted folder');
			//         resolve('done');
			//       } catch (error) {
			//         console.log('error:', error);
			//       }

			//     });
			//   });
			// }


			const processFile = async (file: string, fType: string) => {
				return new Promise(async (resolve) => {
					console.log('processing::', file)
					const originalFile = file; // file // file.replace('.ini', '')
					const ext = path.parse(originalFile).ext;
					// const fileIni = execSync(`find '${renamedFolder}' -type f -name "${path.basename(file)}"`, { encoding: "utf8" }).split('\n');
					// console.log('fileIni', fileIni);
					// if (fileIni[0]) {
					// const fileContent = fs.readFileSync(fileIni[0], { encoding: 'utf8' });
					const fileName = `${path.basename(originalFile, ext)}`;  // `${fileContent.split('|')[1]}`; 
					let re;
					if (fType === 'video') {
						re = /^.*Video\//;
					} else if (fType === 'audio') {
						re = /^.*Audio\//;
					}
					const nonVietnamese = nonAccentVietnamese(path.dirname(file).replace(re, ''));
					const nonChinese = await pinyin(nonVietnamese, { removeTone: true, keepRest: true }); // this line for non Chinese characters
					console.log('nonChinese', nonChinese);
					const pUrl = nonChinese.toLowerCase().replace(/\./g, '-').replace(/\//g, '\.').replace(/[\s\_\+\=\*\>\<\,\'\"\;\:\!\@\#\$\%\^\&\*\(\)]/g, '-').replace(/-+-/g, "-");
					// await checkFileExists(fileName, pUrl, fType);
					console.log('pURL', pUrl);
					const pAPI = execSync(`find '${apiPath}/topics/single' -type f -name "${pUrl}.json"`, { encoding: "utf8" }).split('\n');
					console.log('pAPI', pAPI);

					if (pAPI && pAPI[0]) {
						const pContent = fs.readFileSync(pAPI[0], { encoding: 'utf8' });
						const pItem = JSON.parse(pContent);
						// check if file exist
						// const fileExist = await checkFileExists(fileName, pItem.url, fType);
						// if (!fileExist) {
						// await downloadLocal(originalFile);
						const localOriginPath = file; // `${originalTemp}/${path.parse(originalFile).base}`;
						if (fs.existsSync(localOriginPath)) {
							// // // extract thumbnail instance code start
							// await extractThumb(localOriginPath, fileName, pItem, localOutPath);
							// // // extract thumbnail instance code end

							// check and convert mp4 to m3u8
							const fileOk = await checkMP4(localOriginPath, fType); // audio dont need check MP4
							if (fileOk) {
								// convert and up encrypted and database
								let fStat: string;
								const checkNonSilence = await execSync(`ffmpeg -i "${localOriginPath}" 2>&1 | grep Audio | awk '{print $0}' | tr -d ,`, { encoding: 'utf8' });
								if (checkNonSilence) fStat = fType; else fStat = 'videoSilence';
								await convertFile(localOriginPath, fileName, fStat, pItem, localOutPath);

								// // rename and up vietnamese warehouse
								// const renamedVietnamese = `${originalTemp}/${fileName}${ext}`;
								// if (!fs.existsSync(renamedVietnamese)) {
								//   await execSync(`mv "${localOriginPath}" "${renamedVietnamese}"`);
								// }
								// const warehouseDir = `${path.dirname(fileIni[0]).replace(/^.*renamed/, '')}`;
								// console.log('uploading Origin', originalFile, warehouseDir);
								// await upWarehouse(renamedVietnamese, warehouseDir);

								// remove downloaded file when done
								// await fs.unlinkSync(renamedVietnamese);
								// await fs.unlinkSync(fileIni[0]);
								resolve('done');
							} else {
								await fs.appendFileSync(`${prefix}/database${lang}/${fileType}-converted-count.txt`, `\n broken`);
								// await fs.unlinkSync(fileIni[0]);
								resolve('done');
							}
							// }
						}
						else {
							// await fs.unlinkSync(fileIni[0]);
							resolve('done');
						}

						// // // store instant db code start 
						// const dataExist = await checkDBExists(fileName, pItem.url);
						// if (!dataExist) {
						//   const mountedOriginPath = `${mountedOrigin}${originalFile}`;
						//   console.log('store new api', fileIni[0]);
						//   await storeDB(mountedOriginPath, fileName, pItem);
						//   await fs.unlinkSync(fileIni[0]);
						// } else {
						//   await fs.appendFileSync(`${prefix}/database/${fileType}-converted-count.txt`, `\n ${fileIni[0]} db exist`);
						//   console.log('api exist', fileIni[0]);
						//   await fs.unlinkSync(fileIni[0]);
						// }
						// // store instant db code end 
					} else {
						await fs.appendFileSync(`${prefix}/database${lang}/${fileType}-converted-count.txt`, `\n ${file} --err no pAPI found`);
						resolve('done');
					}
					// } else {
					//   await fs.appendFileSync(`${prefix}/database/${fileType}-converted-count.txt`, `\n ${fileIni[0]} --err no pAPI found`);
					//   resolve('done');
					// }
				})
			};

			// start script here
			const raw = fs.readFileSync(txtPath, { encoding: 'utf8' });
			if (raw) {
				let list = raw.split('\n');
				list.pop();
				// list.reverse();
				console.log('total files', list.length);
				// let i = startPoint;


				// // convert audio loops

				for (let i = startPoint; i < list.length; i++) { // list.length or endPoint
					(async () => {
						queue.add(async () => {
							// if (!list[i].includes('Info.ini')) {
							await processFile(list[i], fileType);
							await fs.appendFileSync(`${prefix}/database${lang}/${fileType}-converted-count.txt`, `\n${i}`);
							console.log('processed files', i);
							// } else {
							//   await fs.appendFileSync(`${prefix}/database/${fileType}-converted-count.txt`, `\n${i} --skip Info.ini`);
							// }
						});
						// console.log('Done 1 file');
					})();
				}
				// p-queue end
				// // convert audio loops end

				// // convert video loops
				// while (i < list.length) { // list.length or endPoint
				//   if (!list[i].includes('Info.ini')) {
				//     await processFile(list[i], fileType);
				//     await fs.appendFileSync(`${prefix}/database/${fileType}-converted-count.txt`, `\n${i}`);
				//     console.log('processed files', i);
				//   } else {
				//     await fs.appendFileSync(`${prefix}/database/${fileType}-converted-count.txt`, `\n${i} --skip Info.ini`);
				//   }
				//   i++;
				// }
				// // // QmdFcsTExrPaEKR3tkE69pP6AMpmZKK98gSBTyx2cRxW7a test QmWhTKbYab3r9rbQ7S5t2PXcMVPRGQeqt6M31Mv2KjPKAh
				// // convert video loops end
			}
		} catch (error) {
			console.log('total error', error);
		}
		// end instant code


		// ipfsClient = create({
		//   url: 'http://ipfs.hjm.bid',
		//   port: 80,
		//   protocol: 'http',
		//   apiPath: '/api/v0'
		// });
		// const config = ipfsClient.getEndpointConfig();
		// console.log(config);
		// const ipfsout = await ipfsClient.add('Hello world')
		// const cid: CID = ipfsout.cid;
		// console.log(cid);
		// console.log(cid.toString());


		// try {
		//   const now = new Date();
		//   const timenow = now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds();
		//   console.log(timenow);
		//   const test = await ipfsClient.add('Hello world');
		//   console.log(test);
		//   const testpath = `${prefix}/paris/stream_480p`;
		//   console.log(testpath);
		//   // const ci = await ipfsClient.add(testpath);
		//   // const ci = await ipfsClient.addAll(globSource(testpath, { recursive: true }));
		//   for await (const file of ipfsClient.addAll(globSource(testpath, { recursive: true }))) {
		//     console.log(file)
		//   }
		//   // console.log(ci);

		//   const later = new Date();
		//   const timelater = later.getHours() + ":" + later.getMinutes() + ":" + later.getSeconds();
		//   console.log(timelater);
		// } catch (err) {
		//   console.log(err);
		//   // https://stream.hjm.bid/ipfs/QmUWngZk4zaFJ6cA8EEHS8GpSytsosadJiGHKJRQH2rcp9/playlist.m3u8
		//   // console.log('error https://ipfs.hjm.bid/ipfs/QmPY7pn6e3wHrTsudofP2XdD3AQLXuSo7jWxovmp68k7sz/playlist.m3u8', err);
		// }


		// const ci: any = await ipfsClient.add(globSource('${prefix}/Desktop/testfolder', { recursive: true }))
		// console.log(ci);
		// console.log(arg);
		// const id = await ipfsClient.id();
		// console.log(id);
		// const online = await ipfsClient.isOnline();
		// console.log(online)
		// const ipfsOut: any = await ipfsClient.add('hello world');
		// console.log(ipfsOut);
		// if (ipfsOut) {
		//   const cid: CID = ipfsOut.cid;
		//   console.log(cid);
		// }



		// const secretKey = slice(0, 32, 'jashdkfhjkahj4350pdfvkhdv');
		// const test = CryptoJS.AES.encrypt('fileInfo.qm', secretKey).toString();
		// console.log('test called');
		// // export json for meiliSeasrch from multiple json files
		// let meiliSearch: any = [];
		// const apiFolder = '${prefix}/Desktop/vgm/API/items/single';
		// fs.promises.readdir(apiFolder).then(files => {
		//   let i = 0;
		//   files.forEach(item => {
		//     fs.promises.readFile(`${apiFolder}/${item}`, { encoding: "utf8" }).then(result => {
		//       meiliSearch.push(JSON.parse(result));
		//       i++
		//       console.log(result, i);
		//       if (i === files.length) {
		//         const json: string = JSON.stringify(meiliSearch);
		//         fs.writeFile('${prefix}/Desktop/search.json', json, 'utf8', function (err) {
		//           if (err) throw err;
		//         });
		//       }
		//     }).catch(err => {
		//       console.log(err);
		//     })
		//   });
		// }).catch((error) => {
		//   console.log(error);
		// });


		// })
	})

	ipcMain.handle('export-database', async (event, apiType: string, item, outpath, fileType, isVideo?: boolean) => {
		console.log('export-database called');

		let filePath: string;
		let json: string;
		// handle json file
		if (fileType === 'searchAPI') {
			json = JSON.stringify(item);
		} else {
			json = JSON.stringify(item, null, 2);
		}
		// handle file path
		if (fileType === 'itemList') {
			filePath = `${outpath.toString()}/API-${apiType}/items/list/${item.url}.json`
		} else if (fileType === 'itemSingle') {
			filePath = `${outpath.toString()}/API-${apiType}/items/single/${item.url}.json`
		} else if (fileType === 'topicList') {
			filePath = `${outpath.toString()}/API-${apiType}/topics/list/${item.url}.json`
		} else if (fileType === 'topicSingle') {
			filePath = `${outpath.toString()}/API-${apiType}/topics/single/${item.url}.json`
		} else if (fileType === 'searchAPI' && isVideo) {
			filePath = `${outpath.toString()}/API-${apiType}/searchAPI-VGMV.json`;
		} else if (fileType === 'searchAPI' && !isVideo) {
			filePath = `${outpath.toString()}/API-${apiType}/searchAPI-VGMA.json`;
		}

		const dir = path.dirname(filePath)
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
		await fs.writeFile(filePath, json, function (err) {
			if (err) throw err;
		});
		return 'done';
	})

	ipcMain.handle('exec-db-confirmation', async (event, method) => {
		try {
			let options;
			if (method === 'updateDB') {
				options = {
					type: 'question',
					buttons: ['Cancel', 'Update'],
					defaultId: 0,
					title: 'Update Confirmation',
					message: 'Are you sure want to update selected entries',
					detail: 'Update data will also update entries on network',
				}
			} else if (method === 'deleteDB') {
				options = {
					type: 'question',
					buttons: ['Cancel', 'Delete data'],
					defaultId: 0,
					title: 'Deletion Confirmation',
					message: 'Are you sure want to delete selected entries',
					detail: 'Delete data will also update entries on network',
				}
			}
			return await dialog.showMessageBox(win, options).then(result => {
				return { method: method, response: result.response }
			})
		} catch (error) {
			console.log(error);
			return null
		}
	})


	ipcMain.handle('exec-db-done', (event, message) => {
		const options = {
			type: 'info',
			title: 'Done',
			message: 'Your request have been executed sucessfully!',
			detail: message,
		};
		showMessageBox(options);
	})

	app.on('activate', () => {
		// On macOS it's common to re-create a window in the app when the
		// dock icon is clicked and there are no other windows open.
		if (win === null) {
			createWindow();
		}
	});


	// Show message box function
	function showMessageBox(options) {
		dialog.showMessageBox(null, options).then(result => {
			console.log(result.response);
		}).catch(err => { console.log(err) });
	}

	// Rewrite vietnamese function
	function nonAccentVietnamese(str) {
		//     We can also use this instead of from line 11 to line 17
		//     str = str.replace(/\u00E0|\u00E1|\u1EA1|\u1EA3|\u00E3|\u00E2|\u1EA7|\u1EA5|\u1EAD|\u1EA9|\u1EAB|\u0103|\u1EB1|\u1EAF|\u1EB7|\u1EB3|\u1EB5/g, "a");
		//     str = str.replace(/\u00E8|\u00E9|\u1EB9|\u1EBB|\u1EBD|\u00EA|\u1EC1|\u1EBF|\u1EC7|\u1EC3|\u1EC5/g, "e");
		//     str = str.replace(/\u00EC|\u00ED|\u1ECB|\u1EC9|\u0129/g, "i");
		//     str = str.replace(/\u00F2|\u00F3|\u1ECD|\u1ECF|\u00F5|\u00F4|\u1ED3|\u1ED1|\u1ED9|\u1ED5|\u1ED7|\u01A1|\u1EDD|\u1EDB|\u1EE3|\u1EDF|\u1EE1/g, "o");
		//     str = str.replace(/\u00F9|\u00FA|\u1EE5|\u1EE7|\u0169|\u01B0|\u1EEB|\u1EE9|\u1EF1|\u1EED|\u1EEF/g, "u");
		//     str = str.replace(/\u1EF3|\u00FD|\u1EF5|\u1EF7|\u1EF9/g, "y");
		//     str = str.replace(/\u0111/g, "d");
		str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
		str = str.replace(/ƀ/g, "b");
		str = str.replace(/č/g, "c");
		str = str.replace(/è|é|ẹ|ẻ|ẽ|ĕ|ê|ề|ế|ệ|ể|ễ|ê̆/g, "e");
		str = str.replace(/ì|í|ị|ỉ|ĩ|ĭ/g, "i");
		str = str.replace(/ò|ó|ọ|ỏ|õ|ŏ|ô|ồ|ố|ộ|ổ|ỗ|ô̆|ơ|ờ|ớ|ợ|ở|ỡ|ơ̆/g, "o");
		str = str.replace(/ù|ú|ụ|ủ|ũ|ŭ|ư|ừ|ứ|ự|ử|ữ|ư̆/g, "u");
		str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
		str = str.replace(/đ/g, "d");
		str = str.replace(/ñ/g, "n");

		str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
		str = str.replace(/Ƀ/g, "B");
		str = str.replace(/Č/g, "C");
		str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ĕ|Ê̆|Ề|Ế|Ệ|Ể|Ễ/g, "E");
		str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ|Ĭ/g, "I");
		str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ|Ŏ|Ơ̆|Ô̆/g, "O");
		str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ŭ|Ư|Ừ|Ứ|Ự|Ử|Ữ|Ư̆/g, "U");
		str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
		str = str.replace(/Đ|Ð/g, "D");
		str = str.replace(/Ñ/g, "N");
		// Some system encode vietnamese combining accent as individual utf-8 characters
		str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, ""); // Huyền sắc hỏi ngã nặng 
		str = str.replace(/\u02C6|\u0306|\u031B/g, ""); // Â, Ê, Ă, Ơ, Ư
		// str = str.replace(/-+-/g, "-"); //thay thế 2- thành 1- 
		return str;
	}


} catch (err) { }

function quit() {
	if (ipfsInfo) {
		exec(`docker container inspect ${ipfsInfo.container}`, (error, stdout, stderr) => {
			if (stdout) {
				exec(`docker kill ${ipfsInfo.container}`, (error, stdout, stderr) => { console.log(`ipfs container ${stdout} killed`) })
			}
		})
	}
	if (process.platform !== 'darwin') {
		app.quit();
	}
}


