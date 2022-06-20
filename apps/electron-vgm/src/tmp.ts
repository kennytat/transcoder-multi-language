import { app, BrowserWindow, ipcMain, screen, dialog, Menu, globalShortcut } from 'electron'
import { exec, spawn, execSync, spawnSync } from 'child_process'
import * as fs from 'fs'
import * as CryptoJS from "crypto-js";
import { slice } from 'ramda';
import * as path from 'path'
import { showMessageBox, langToLatin, uploadIPFS, rcloneSync, md5Checksum } from './function';
import { FileInfo } from './database';
import { tmpDir } from './index';
import PQueue from 'p-queue';
const queue = new PQueue();
// import { NFTStorage, File, Blob } from 'nft.storage'

export const tmpService = () => {

	ipcMain.handle('test-data', async (event, str) => {

		const result = await md5Checksum(str);
		console.log(result);
		return result;

	})


	// const endpoint: any = 'https://api.nft.storage'; // the default
	// const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDg2YzE5MTE1ODZlRTZDODZhN2EzM2NCOTliOEY5MzIzNTU3RTJEMWQiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTYzODk0NDM1MjY5OCwibmFtZSI6InZnbS1pcGZzIn0.0rr-RBbRTxWIfpQpbMoRZ7jBI1hYtL0EB_vgmj7tNCk' // your API key from https://nft.storage/manage

	// const { createLogger, transports } = require("winston");
	// const LokiTransport = require("winston-loki");
	// const options = {
	//   transports: [
	//     new LokiTransport({
	//       host: "http://127.0.0.1:3100"
	//     })
	//   ]
	// };
	// const logger = createLogger(options);


	// import { S3Client, GetObjectCommand, ListObjectsCommand, CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

	// const s3Client = new S3Client({
	//   credentials: {
	//     accessKeyId: "jxneel2dxcx7kpxqesdewjhfsd2q",
	//     secretAccessKey: "j3wgjr6lyvmyl4m37mcdwacnxdizinen2nhfvkbyyqgsbkfctcm3k",
	//   },
	//   endpoint: "https://gateway.ap1.storjshare.io",
	//   region: "ap-east-1"
	// });

	// instance hash to db function

	ipcMain.handle('upload-tmp-api', async (event, apiType) => {
		try {
			if (apiType === 'web') {
				const src = path.join(tmpDir, `API-${apiType}`);
				const des = `VGM-Converted:vgmencrypted/encrypted/API`;
				const extraOption = ['--no-update-modtime', '--transfers', '10', '--s3-chunk-size', '64M'];
				console.log('uploading API:', src, des, undefined, extraOption);
				await rcloneSync(src, des, undefined, extraOption);
				return 'done';
			}
			if (apiType === 'speaker') {
				return 'done';
			}
		} catch (error) {
			console.log(error);
			return null
		}
	})

	ipcMain.on('ipfs-hash-to-db', async (event, prefix, startPoint, endPoint) => {
		try {
			queue.concurrency = 1;
			const txtPath = `${prefix}/database/video-inipfs-count.txt`;
			const apiPath = `${prefix}/database/API/items/single`;

			const processFile = async (file: string, qm: string) => {
				console.log(file);
				return new Promise(async (resolve) => {
					const jsonString = await fs.readFileSync(`${apiPath}/${file}.json`, { encoding: 'utf8' });
					let fileInfo: any = JSON.parse(jsonString);
					fileInfo.qm = qm;
					const secretKey = slice(0, 32, `${fileInfo.url}gggggggggggggggggggggggggggggggg`);
					fileInfo.hash = CryptoJS.AES.encrypt(fileInfo.qm, secretKey).toString();
					console.log('updated fileInfo', fileInfo);
					const ls = spawn('pwd');
					ls.on('close', (code) => {
						event.sender.send('update-ipfs', fileInfo);
					});
					if (fileInfo.qm) {
						resolve(true)
					}
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
				for (let i = startPoint; i < endPoint; i++) { // list.length or endPoint
					(async () => {
						queue.add(async () => {
							if (list[i]) {
								const parsedInfo = list[i].split('|');
								const filePath = parsedInfo[1];
								const qm = parsedInfo[2]
								console.log(filePath, qm);

								await processFile(filePath, qm);
								console.log('processed files', i);
							}
						});
					})();
				}
			}

		} catch (error) {
			console.log(error);
		}

	})

	ipcMain.on('create-instance-db', async (event, prefix, startPoint, endPoint) => {
		try {
			queue.concurrency = 1;
			// const videoOldUrlTxt = `${prefix}/database/videoSingle.txt`;

			const newUrlTxt = `${prefix}/database/videowarehouseSingle.txt`;
			const apiPath = `${prefix}/API-web/topics/single`;
			const apiItem = `${prefix}/API-web/items/single`;

			// const rawOld = fs.readFileSync(videoOldUrlTxt, { encoding: 'utf8' });
			// const oldArray = rawOld.split('\n');

			const processFile = async (file: string) => {
				console.log('processing:', file);

				return new Promise(async (resolve) => {

					const pureLatin = langToLatin(file);
					const api = `${pureLatin.replace(/(.*VGMA\/|.*VGMV\/)/, '').toLowerCase().replace(/(\.mp3$|\.mp4$)/g, '').replace(/\./g, '-').replace(/\//g, '.').replace(/(?!\.)[\W\_]/g, '-').replace(/-+-/g, "-")}`;
					console.log('file API:', api);
					const pApi = api.match(/.*(?=\..*$)/).toString();
					console.log('pAPI:', pApi);
					if (fs.existsSync(`${apiPath}/${pApi}.json`)) {

						const jsonString = await fs.readFileSync(`${apiPath}/${pApi}.json`, { encoding: 'utf8' });
						let pItem: any = JSON.parse(jsonString);
						let fileInfo: FileInfo = { pid: '', md5: '', name: '', size: 0, duration: '', qm: '', url: '', hash: '', khash: '', isVideo: true, dblevel: 0 };
						// fileInfo.isLeaf = true;
						// resolve(fileInfo);
						// get new file info
						fileInfo.url = api;
						fileInfo.pid = pItem.id;
						fileInfo.isVideo = pItem.isVideo;
						fileInfo.dblevel = pItem.dblevel + 1;
						fileInfo.md5 = (execSync(`md5sum "${file}" | awk '{print $1}'`, { encoding: "utf8" })).split('\n')[0];
						// get file Info
						let metaData: any = [];
						metaData = execSync(`ffprobe -v quiet -select_streams v:0 -show_entries format=filename,duration,size,stream_index:stream=avg_frame_rate -of default=noprint_wrappers=1 "${file}"`, { encoding: "utf8" }).split('\n');
						// Then run ffmpeg to start convert
						const duration_stat: string = metaData.filter(name => name.includes("duration=")).toString();
						const duration: number = parseFloat(duration_stat.replace(/duration=/g, ''));
						const minutes: number = Math.floor(duration / 60);
						fileInfo.duration = `${minutes}:${Math.floor(duration) - (minutes * 60)}`;
						fileInfo.size = parseInt(metaData.filter(name => name.includes("size=")).toString().replace('size=', ''));
						fileInfo.name = path.parse(file).name;
						console.log('fileInfo:', fileInfo);
						const json = JSON.stringify(fileInfo);
						await fs.writeFileSync(`/home/vgm/Desktop/videodb/${fileInfo.url}.json`, json);
						resolve(true)
						//  read file info from files
						// if (!fs.existsSync(`${apiItem}/${api}.json`)) {
						// fs.readFile(`/home/vgm/Desktop/videodb/${api}.json`, { encoding: 'utf8' }, (err, data) => {
						// if (data) {
						// fileInfo = JSON.parse(data.toString());
						//  resolve(fileInfo)
						// }
						// if (err) {
						//  resolve(false)
						//  }
						// });
						// } else {
						// await fs.appendFileSync(`/home/vgm/Desktop/database/video-db-count.txt`, `\n|exist|${api}`);
						// resolve(false);
						// }
					} else {
						await fs.appendFileSync(`/home/vgm/Desktop/database/video-db-count.txt`, `\n|papinotfound|${pApi}`);
						resolve(false)
					}
				})
			};

			// start script here
			const rawNew = fs.readFileSync(newUrlTxt, { encoding: 'utf8' });
			if (rawNew) {
				let list = rawNew.split('\n');
				list.pop();
				// list.reverse();
				console.log('total files', list.length);
				for (let i = startPoint; i < endPoint; i++) { // list.length or endPoint
					(async () => {
						queue.add(async () => {
							if (list[i]) {
								const result: any = await processFile(list[i]);
								if (result) {
									await fs.appendFileSync(`/home/vgm/Desktop/database/video-db-count.txt`, `\n${i}`);
									// await delay(100);
									// const ls = spawn('pwd');
									// ls.on('close', (code) => {
									// event.sender.send('create-database', result);
									// });
								} else {
									// await fs.appendFileSync(`/home/vgm/Desktop/database/video-db-count.txt`, `\n${i}|exist|${list[i]}`);
								}
								console.log('processed files', i);
							}
						});
					})();
				}
			}

		} catch (error) {
			console.log(error);
		}

	})



	// ipcMain.on('renamedFolder', async (event, prefix, fileType, startPoint, endPoint) => { // start instant code
	// 	// // copy ini file to local then rename folder
	// 	const txtPath = `${prefix}/database/VGMVDir.txt`;
	// 	const copyFile = (file) => {
	// 		return new Promise((resolve, reject) => {
	// 			const sourceDir = path.parse(file).dir;
	// 			const desDir = sourceDir.replace('origin', 'renamed');
	// 			if (!fs.existsSync(desDir)) {
	// 				fs.mkdirSync(desDir, { recursive: true });
	// 			}
	// 			const copy = execSync(`cp '${file}' '${desDir}'`);
	// 			if (copy) {
	// 				resolve('done');
	// 			}
	// 		});
	// 	}

	// 	try {
	// 		const raw = fs.readFileSync(txtPath, { encoding: 'utf8' });
	// 		if (raw) {
	// 			let list = raw.split('\n');
	// 			list.pop();
	// 			// list.reverse();
	// 			console.log('total files', list.length);
	// 			let i = startPoint;

	// 			// convert video loops
	// 			while (i < 1) { // list.length or endPoint
	// 				await copyFile(list[i]);
	// 				console.log('processed files', i);
	// 				i++;
	// 			}
	// 		}
	// 	} catch (error) {
	// 		console.log(error);

	// 	}
	// })



	// ipcMain.on('xor-key', async (event, url, isVideo) => { // start instant code 
	// 	// encrypte && decrypte key start
	// 	let m3u8Name = isVideo ? '480p' : '128p';
	// 	try {
	// 		// encrypt key file
	// 		const reader = new M3U8FileParser();
	// 		const segment = fs.readFileSync(`${url}/${m3u8Name}.m3u8`, { encoding: 'utf-8' });
	// 		reader.read(segment);
	// 		const m3u8 = reader.getResult();
	// 		const secret = `VGM-${m3u8.segments[0].key.iv.slice(0, 6).replace("0x", "")}`;
	// 		// get buffer from key and iv
	// 		const code = Buffer.from(secret);

	// 		const key: Buffer = await fs.readFileSync(`${url}/key.vgmk`);
	// 		const encrypted = bitwise.buffer.xor(key, code, false);
	// 		console.log(key, '\n', code, '\n', encrypted);

	// 		const codeArray = new Uint8Array(code);
	// 		const keyArray = new Uint8Array(key);
	// 		const newKeyArray = new Uint8Array(encrypted);

	// 		console.log(keyArray, codeArray, newKeyArray);
	// 		fs.writeFileSync(`${url}/key.vgmk`, encrypted, { encoding: 'binary' })
	// 	} catch (error) {
	// 		console.log('encrypt key error:', error);
	// 	}
	// 	// encrypte && decrypte key end
	// })




	// mass xor key ipfs for ios function
	// ipcMain.on('xor-key-ipfs', async (event, prefix, startPoint, endPoint) => {
	// 	try {
	// 		queue.concurrency = 40;
	// 		const txtPath = `${prefix}/database/VGMSingle.txt`;
	// 		const originalTemp = `${prefix}/database/tmp`;
	// 		const apiPath = `${prefix}/database/API/items/single`;

	// 		const downloadConverted = async (fileLocation, outPath) => {
	// 			console.log('download converted file', `${fileLocation}`, `${outPath}/`);
	// 			return new Promise(async (resolve) => {
	// 				const rclone = spawn('rclone', ['copy', '--progress', `${fileLocation}`, `${outPath}/`]);
	// 				rclone.stdout.on('data', async (data) => {
	// 					console.log(`rclone download converted stdout: ${data}`);
	// 				});
	// 				rclone.stderr.on('data', async (data) => {
	// 					console.log(`Stderr: ${data}`);
	// 				});
	// 				rclone.on('close', async (code) => {
	// 					console.log(`download converted file done with code:`, code);
	// 					resolve(true);
	// 				})
	// 			});
	// 		}


	// 		const processFile = async (file: string) => {
	// 			console.log(file);
	// 			return new Promise(async (resolve) => {

	// 				try {
	// 					const jsonString = await fs.readFileSync(`${apiPath}/${file}.json`, { encoding: 'utf8' });
	// 					let fileInfo: any = JSON.parse(jsonString);
	// 					// console.log('old file info', fileInfo);
	// 					const convertedPath = fileInfo.isVideo ? `VGM-Converted:vgmencrypted/encrypted/VGMV` : `VGM-Converted:vgmencrypted/encrypted/VGMA`;
	// 					const cloudPath = file.replace(/\./g, '\/');
	// 					const fileDir = `${originalTemp}/${file}`; // cloudPath or file
	// 					const fileExist = await execSync(`rclone lsf '${convertedPath}/${cloudPath}/key.vgmk'`, { encoding: 'utf8' }) ? true : false;
	// 					console.log('file Existtttt:', fileExist);
	// 					if (fileExist) {
	// 						const m3u8Name = fileInfo.isVideo ? '480p.m3u8' : '128p.m3u8';
	// 						const keyPath = `${fileDir}/${m3u8Name}`;
	// 						await downloadConverted(`${convertedPath}/${cloudPath}/${m3u8Name}`, fileDir);
	// 						await downloadConverted(`${convertedPath}/${cloudPath}/key.vgmk`, fileDir);
	// 						const reader = new M3U8FileParser();
	// 						const segment = await fs.readFileSync(keyPath, { encoding: 'utf-8' });
	// 						reader.read(segment);
	// 						const m3u8 = reader.getResult();
	// 						const secret = `VGM-${m3u8.segments[0].key.iv.slice(0, 6).replace("0x", "")}`;
	// 						// get buffer from key and iv
	// 						const code = Buffer.from(secret);
	// 						const key: Buffer = await fs.readFileSync(`${fileDir}/key.vgmk`);
	// 						const encrypted = bitwise.buffer.xor(key, code, false);
	// 						console.log(secret, key, encrypted);
	// 						await fs.writeFileSync(`${fileDir}/key.vgmk`, encrypted, { encoding: 'binary' });
	// 						console.log('xor key finished!!!');
	// 						const cid = await uploadIPFS(`${fileDir}/key.vgmk`);
	// 						// console.log('cid from ipfs', cid);
	// 						const secretKey = slice(0, 32, `${fileInfo.url}gggggggggggggggggggggggggggggggg`);
	// 						fileInfo.khash = CryptoJS.AES.encrypt(cid.toString(), secretKey).toString();
	// 						console.log('updated fileInfo', fileInfo);
	// 						const ls = spawn('echo', ['hello']);
	// 						ls.on('close', async (code) => {
	// 							event.sender.send('update-ipfs', fileInfo);
	// 						});
	// 						if (fileInfo.khash) {
	// 							await fs.rmdir(fileDir, { recursive: true }, () => {
	// 								console.log("Folder Deleted!");
	// 								resolve(true)
	// 							});
	// 						}
	// 					} else {
	// 						resolve(false)
	// 					}
	// 				} catch (error) {
	// 					resolve(false)
	// 					console.log(error);
	// 				}
	// 			})
	// 		};

	// 		// start script here
	// 		const raw = fs.readFileSync(txtPath, { encoding: 'utf8' });

	// 		if (raw) {
	// 			let list = raw.split('\n');
	// 			list.pop();
	// 			// list.reverse();
	// 			console.log('total files', list.length);
	// 			// let i = startPoint;
	// 			for (let i = startPoint; i < list.length; i++) { // list.length or endPoint
	// 				(async () => {
	// 					queue.add(async () => {
	// 						const result = await processFile(list[i]);
	// 						console.log('processed files', i);
	// 						if (result) {
	// 							await fs.appendFileSync(`${prefix}/database/xor-key-ipfs-count.txt`, `\n${i}`);
	// 						} else {
	// 							await fs.appendFileSync(`${prefix}/database/xor-key-ipfs-count.txt`, `\n${i}-notfound: ${list[i]}`);
	// 						}
	// 					});
	// 				})();
	// 			}
	// 		}
	// 	} catch (error) {
	// 		console.log(error);
	// 	}

	// })



	// check children count of topic 
	// ipcMain.on('get-count', async (event) => {
	// 	const processFile = async (file: string) => {
	// 		console.log(file);
	// 		return new Promise(async (resolve) => {
	// 			const jsonString = await fs.readFileSync(file, { encoding: 'utf8' });
	// 			let fileInfo: any = JSON.parse(jsonString);

	// 			const ls = spawn('pwd');
	// 			ls.on('close', async (code) => {
	// 				fileInfo.hash = '';
	// 				fileInfo.khash = '';
	// 				fileInfo.md5 = ''
	// 				await delay(500);
	// 				resolve(fileInfo);
	// 				// if (fileInfo.children[0] && !fileInfo.count) {
	// 				//   fileInfo.count = fileInfo.children.length;
	// 				//   await delay(500)
	// 				//   resolve(fileInfo);
	// 				// } else {
	// 				//   console.log(fileInfo);
	// 				//   resolve(false);
	// 				// }
	// 			});
	// 		})
	// 	};


	// 	// start script here
	// 	const raw = execSync(`find '/home/vgm/Desktop/API-web/items/single' -type f -name '*.json'`, { encoding: 'utf8' });

	// 	if (raw) {
	// 		queue.concurrency = 1;
	// 		let list = raw.split('\n');
	// 		list.pop();
	// 		// list.reverse();
	// 		console.log('total files', list.length);
	// 		// let i = startPoint;
	// 		for (let i = 0; i < list.length; i++) { // list.length or endPoint
	// 			(async () => {
	// 				queue.add(async () => {
	// 					const result = await processFile(list[i]);
	// 					// const delayTime = Math.random() * 300;
	// 					if (result) {
	// 						event.sender.send('update-count', result);
	// 					}
	// 					console.log('processed files', i);

	// 				});
	// 			})();
	// 		}
	// 	}
	// })




}
